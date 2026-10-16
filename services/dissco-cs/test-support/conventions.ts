// Shared by backend/test/conventions.test.ts and frontend/test/conventions.test.ts: scans a package's
// src/ for patterns we have deliberately cleaned up, so they cannot quietly come back by copying an
// old file. A rule names what to do instead; an exception must say why it is allowed.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

export interface ConventionRule {
  name: string;
  pattern: RegExp;
  // What to write instead (with the CLAUDE.md section), shown when the rule is broken.
  instead: string;
  // Path relative to src/ (a folder ends with '/') -> why this file may use the pattern.
  allowedIn?: Record<string, string>;
  // Only check files whose path (relative to src/) matches, e.g. /\.logic\.ts$/.
  onlyIn?: RegExp;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

// Splits a line into its code and its comment text. `inBlock` carries an open /* ... */ over to
// the next line.
function splitLine(line: string, inBlock: { value: boolean }): { code: string; comment: string } {
  let code = '';
  let comment = '';
  let rest = line;
  while (rest.length > 0) {
    if (inBlock.value) {
      const end = rest.indexOf('*/');
      if (end === -1) return { code, comment: comment + rest };
      comment += rest.slice(0, end);
      inBlock.value = false;
      rest = rest.slice(end + 2);
      continue;
    }
    const block = rest.indexOf('/*');
    const lineComment = rest.indexOf('//');
    if (lineComment !== -1 && (block === -1 || lineComment < block)) {
      return { code: code + rest.slice(0, lineComment), comment: comment + rest.slice(lineComment + 2) };
    }
    if (block === -1) return { code: code + rest, comment };
    code += rest.slice(0, block);
    inBlock.value = true;
    rest = rest.slice(block + 2);
  }
  return { code, comment };
}

// Comments may mention a pattern (e.g. "never refetch() here") without using it.
function withoutComments(line: string, inBlock: { value: boolean }): string {
  return splitLine(line, inBlock).code;
}

function isAllowed(file: string, rule: ConventionRule): boolean {
  if (rule.onlyIn && !rule.onlyIn.test(file)) return true;
  return Object.keys(rule.allowedIn ?? {}).some(allowed => (allowed.endsWith('/') ? file.startsWith(allowed) : file === allowed));
}

// Every place in srcDir that breaks the rule, as "file:line  code".
export function findViolations(srcDir: string, rule: ConventionRule): string[] {
  const violations: string[] = [];
  for (const path of sourceFiles(srcDir)) {
    const file = relative(srcDir, path).replace(/\\/g, '/');
    if (isAllowed(file, rule)) continue;
    const inBlock = { value: false };
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .forEach((line, index) => {
        if (rule.pattern.test(withoutComments(line, inBlock))) {
          violations.push(`${file}:${index + 1}  ${line.trim()}`);
        }
      });
  }
  return violations;
}

// Comment rules shared by backend and frontend (CLAUDE.md §7).
export const commentRules: ConventionRule[] = [
  {
    name: 'Comments are in English',
    // Common Dutch words that never occur in English text.
    pattern: /\b(het|een|niet|wordt|zodat|omdat|deze|ook|enkel|zie|i\.p\.v\.)\b/i,
    instead: 'write the comment in English -- CLAUDE.md §7',
  },
  {
    name: 'No project management in comments',
    pattern: /\bFase \d|\bAC\d|\bsee [\w/ -]+ discussion/i,
    instead: 'explain the why itself; history and tickets go in the commit or PR -- CLAUDE.md §7',
  },
];

// Like findViolations, but looks only inside comments (e.g. for the language of comments).
export function findCommentViolations(srcDir: string, rule: ConventionRule): string[] {
  const violations: string[] = [];
  for (const path of sourceFiles(srcDir)) {
    const file = relative(srcDir, path).replace(/\\/g, '/');
    if (isAllowed(file, rule)) continue;
    const inBlock = { value: false };
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .forEach((line, index) => {
        if (rule.pattern.test(splitLine(line, inBlock).comment)) {
          violations.push(`${file}:${index + 1}  ${line.trim()}`);
        }
      });
  }
  return violations;
}

// Functions on a boundary between two layers must carry a JSDoc contract (CLAUDE.md §7): every
// exported function and class in dir, and with `members`, every method of an exported object
// literal (`export const xApi = { name: ... }`). The line right above must end the JSDoc (`*/`).
export function findUndocumented(dir: string, { members }: { members: boolean }): string[] {
  const missing: string[] = [];
  for (const path of sourceFiles(dir)) {
    const file = relative(dir, path).replace(/\\/g, '/');
    const lines = readFileSync(path, 'utf8').split(/\r?\n/);
    let inExportedObject = false;
    lines.forEach((line, index) => {
      const isExport = /^export (async )?(function|class) /.test(line) || /^export const \w+ = (\(|async \()/.test(line);
      if (/^export const \w+ = \{\s*$/.test(line)) {
        inExportedObject = true;
        return;
      }
      if (inExportedObject && /^\};?\s*$/.test(line)) {
        inExportedObject = false;
        return;
      }
      const isMember = members && inExportedObject && /^ {2}\w+: /.test(line);
      if ((isExport || isMember) && !/\*\/\s*$/.test(lines[index - 1] ?? '')) {
        missing.push(`${file}:${index + 1}  ${line.trim()}`);
      }
    });
  }
  return missing;
}

// Every file in srcDir with this extension that is longer than maxLines, as "file  (n lines)".
export function findOversizedFiles(srcDir: string, { extension, maxLines }: { extension: string; maxLines: number }): string[] {
  return sourceFiles(srcDir)
    .filter(path => path.endsWith(extension))
    // The final newline ends the last line, it does not start a new one.
    .map(path => ({ file: relative(srcDir, path).replace(/\\/g, '/'), lines: readFileSync(path, 'utf8').replace(/\r?\n$/, '').split(/\r?\n/).length }))
    .filter(({ lines }) => lines > maxLines)
    .map(({ file, lines }) => `${file}  (${lines} lines)`);
}

export function violationMessage(rule: ConventionRule, violations: string[]): string {
  return `${rule.name}\nInstead: ${rule.instead}\nFound:\n  ${violations.join('\n  ')}`;
}

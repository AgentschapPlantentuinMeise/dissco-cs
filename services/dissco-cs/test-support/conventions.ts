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
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

// Comments may mention a pattern (e.g. "never refetch() here") without using it.
function withoutComments(line: string, inBlock: { value: boolean }): string {
  let code = '';
  let rest = line;
  while (rest.length > 0) {
    if (inBlock.value) {
      const end = rest.indexOf('*/');
      if (end === -1) return code;
      inBlock.value = false;
      rest = rest.slice(end + 2);
      continue;
    }
    const block = rest.indexOf('/*');
    const lineComment = rest.indexOf('//');
    if (lineComment !== -1 && (block === -1 || lineComment < block)) {
      return code + rest.slice(0, lineComment);
    }
    if (block === -1) return code + rest;
    code += rest.slice(0, block);
    inBlock.value = true;
    rest = rest.slice(block + 2);
  }
  return code;
}

function isAllowed(file: string, rule: ConventionRule): boolean {
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

export function violationMessage(rule: ConventionRule, violations: string[]): string {
  return `${rule.name}\nInstead: ${rule.instead}\nFound:\n  ${violations.join('\n  ')}`;
}

// Claude Code PostToolUse hook (Edit|Write): after Claude changes a .ts/.tsx file in the dissco-cs
// backend or frontend, run the vitest tests related to that file. On failure, exit code 2 sends the
// test output back to Claude so it fixes the problem before reporting back. Everything else
// (madoc-ts, docs, config files) is ignored, and a passing run stays silent.
import { spawnSync } from 'node:child_process';
import path from 'node:path';

let raw = '';
for await (const chunk of process.stdin) {
  raw += chunk;
}

const input = JSON.parse(raw || '{}');
const filePath = input.tool_input?.file_path ?? input.tool_response?.filePath;
if (!filePath) {
  process.exit(0);
}

const normalized = path.resolve(filePath).replace(/\\/g, '/');
const match = normalized.match(/^(.*\/services\/dissco-cs\/(?:backend|frontend))\/(src|test)\/.+\.tsx?$/i);
if (!match) {
  process.exit(0);
}

const [, packageDir, folder] = match;
// A changed test file runs itself; a changed source file runs every test that imports it, plus the
// package's conventions test (it scans all of src/, so `related` never picks it up).
const command =
  folder === 'test'
    ? `pnpm exec vitest run "${normalized}" --passWithNoTests`
    : `pnpm exec vitest related "${normalized}" --run --passWithNoTests && pnpm exec vitest run test/conventions.test.ts --passWithNoTests`;

// shell: true so `pnpm` resolves to pnpm.cmd on Windows; the path is quoted in the command above.
const result = spawnSync(command, {
  cwd: packageDir,
  encoding: 'utf8',
  shell: true,
  env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
});

if (result.status !== 0) {
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim().split('\n').slice(-60).join('\n');
  process.stderr.write(`dissco-cs tests failed after editing ${path.basename(normalized)} (${packageDir}):\n${output}\n`);
  process.exit(2);
}

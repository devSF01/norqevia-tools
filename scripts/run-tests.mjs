import { readFile, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const testsDirectory = fileURLToPath(new URL('../tests/', import.meta.url));
const projectRoot = resolve(dirname(testsDirectory));
const testEntries = (await readdir(testsDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && /^.+\.test\.mjs$/.test(entry.name))
  .sort((a, b) => a.name.localeCompare(b.name));

const testFiles = [];
for (const entry of testEntries) {
  const path = join(testsDirectory, entry.name);
  const source = await readFile(path, 'utf8');
  if (/from\s+['"]@playwright\/test['"]/.test(source)) continue;
  testFiles.push(path);
}

if (testFiles.length === 0) {
  throw new Error('tests/*.test.mjs が見つかりません。');
}

const child = spawn(process.execPath, ['--test', ...testFiles], {
  cwd: projectRoot,
  stdio: 'inherit',
  windowsHide: true
});

child.on('error', (error) => {
  console.error(`test runner failed: ${error.message}`);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`test runner stopped by ${signal}`);
    process.exitCode = 1;
  } else {
    process.exitCode = code ?? 1;
  }
});

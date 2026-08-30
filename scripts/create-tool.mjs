import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTool } from './create-tool-core.mjs';

const requiredArguments = ['id', 'number', 'name', 'category', 'template', 'slug', 'description'];

export function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith('--')) throw new Error(`不明な引数です: ${argument}`);
    const key = argument.slice(2);
    if (!requiredArguments.includes(key)) throw new Error(`不明なオプションです: --${key}`);
    if (Object.hasOwn(options, key)) throw new Error(`オプションを重複指定できません: --${key}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`--${key} の値がありません。`);
    options[key] = value;
    index += 1;
  }
  for (const key of requiredArguments) {
    if (!Object.hasOwn(options, key)) throw new Error(`必須オプションがありません: --${key}`);
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const result = await createTool({
    rootDir: resolve(fileURLToPath(new URL('../', import.meta.url))),
    ...options
  });
  console.log(`Scaffold created as draft: ${result.entry.id} (${result.entry.path})`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`create-tool failed: ${error.message}`);
    process.exitCode = 1;
  });
}

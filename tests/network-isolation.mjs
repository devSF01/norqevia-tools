import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const allowedOrigins = new Set(['https://tools.norqevia.com']);
const files = [];
for (const part of ['index.html', 'assets', 'shared', 'text', 'csv', 'privacy', 'terms']) {
  const path = join(root, part);
  try { if ((await readdir(path)).length >= 0) await walk(path); } catch { files.push(path); }
}
async function walk(dir) { for (const item of await readdir(dir, {withFileTypes:true})) { const path=join(dir,item.name); if (item.isDirectory()) await walk(path); else if (item.isFile() && /\.(?:html|css|js|mjs)$/.test(item.name)) files.push(path); } }
const forbidden = [/\bfetch\s*\(/, /\bXMLHttpRequest\b/, /\bWebSocket\b/, /\bEventSource\b/, /\bsendBeacon\b/, /<iframe\b/i, /<script[^>]+\bsrc=["']https?:\/\//i, /<link[^>]+rel=["'][^"']*stylesheet[^"']*["'][^>]+\bhref=["']https?:\/\//i];
const violations=[];
for (const file of files) { const text=await readFile(file,'utf8'); for (const expression of forbidden) if (expression.test(text)) violations.push(`${file}: ${expression}`); for (const url of text.matchAll(/https?:\/\/[^\s"'<>()]+/g)) { try { if (!allowedOrigins.has(new URL(url[0]).origin)) violations.push(`${file}: external URL ${url[0]}`); } catch {} } }
if (violations.length) { console.error(violations.join('\n')); process.exitCode=1; } else console.log(`Network isolation static check passed (${files.length} files scanned).`);

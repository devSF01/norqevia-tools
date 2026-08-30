import { cp, lstat, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCAFFOLD_MARKER, validateSitePath, validateToolsRegistry } from './tool-registry.mjs';

const productionOrigin = 'https://tools.norqevia.com';
const defaultRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const defaultOutput = resolve(defaultRoot, 'dist');
const commonPaths = ['index.html', 'assets', 'shared', 'privacy', 'terms'];

function isInsideRoot(root, path) {
  const pathFromRoot = relative(root, path);
  return pathFromRoot === '' || (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== '..' && !isAbsolute(pathFromRoot));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function exists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function assertDirectory(path, label) {
  try {
    if (!(await lstat(path)).isDirectory()) throw new Error(`${label} がディレクトリではありません: ${path}`);
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`${label} が見つかりません: ${path}`);
    throw error;
  }
}

async function assertDirectoryOrFile(path, label) {
  try {
    await lstat(path);
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`${label} が見つかりません: ${path}`);
    throw error;
  }
}

async function collectFiles(path) {
  const details = await lstat(path);
  if (details.isFile()) return [path];
  if (!details.isDirectory()) return [];
  const files = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(child));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

async function assertNoScaffoldMarker(path, label) {
  if (!(await exists(path))) return;
  for (const file of await collectFiles(path)) {
    const contents = await readFile(file, 'utf8');
    if (contents.includes(SCAFFOLD_MARKER)) {
      throw new Error(`${label} に未完了のScaffold markerが残っています: ${file}`);
    }
  }
}

async function readRegistry(root) {
  const registryPath = join(root, 'tools.json');
  let tools;
  try {
    tools = JSON.parse(await readFile(registryPath, 'utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(`tools.json をparseできません: ${error.message}`);
    throw error;
  }
  return validateToolsRegistry(tools);
}

async function preflight(root, tools) {
  for (const path of commonPaths) await assertDirectoryOrFile(join(root, path), `共通build対象 ${path}`);

  const publishedTools = tools
    .filter((tool) => tool.status === 'published')
    .sort((a, b) => a.number - b.number);
  const plans = [];

  for (const tool of publishedTools) {
    const segments = validateSitePath(tool.path);
    const sourceDirectory = resolve(root, ...segments);
    if (!isInsideRoot(root, sourceDirectory)) throw new Error(`published Toolのsource pathがroot外です: ${tool.path}`);
    await assertDirectory(sourceDirectory, `published Toolのsource directory (${tool.id})`);
    await assertNoScaffoldMarker(sourceDirectory, `published Tool ${tool.id}`);
    await assertNoScaffoldMarker(join(root, 'shared', `${tool.id}-core.js`), `published Tool ${tool.id} のcore`);
    await assertNoScaffoldMarker(join(root, 'shared', `${tool.id}-app.js`), `published Tool ${tool.id} のapp`);
    await assertNoScaffoldMarker(join(root, 'tests', `${tool.id}.test.mjs`), `published Tool ${tool.id} のtest`);
    plans.push({ tool, segments, sourceDirectory });
  }

  return { publishedTools, plans };
}

export async function buildSite({ rootDir = defaultRoot, outputDir = defaultOutput } = {}) {
  const root = resolve(rootDir);
  const output = resolve(outputDir);
  if (!isInsideRoot(root, output) || output === root) throw new Error(`build出力先がsource root内のdistではありません: ${output}`);

  const tools = await readRegistry(root);
  const { publishedTools, plans } = await preflight(root, tools);

  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });

  for (const path of commonPaths) {
    await cp(join(root, path), join(output, path), { recursive: true });
  }
  for (const { segments, sourceDirectory } of plans) {
    const destination = join(output, ...segments);
    await mkdir(dirname(destination), { recursive: true });
    await cp(sourceDirectory, destination, { recursive: true });
  }

  const toolCards = publishedTools.map((tool) =>
    `<a class="tool-card" href="${escapeHtml(tool.path)}"><span class="category">${escapeHtml(tool.category)}</span><h3>${escapeHtml(tool.name)}</h3><p>${escapeHtml(tool.description)}</p><span class="card-link">ツールを開く →</span></a>`
  ).join('');

  const indexPath = join(output, 'index.html');
  let indexHtml = await readFile(indexPath, 'utf8');
  const cardListPattern = /(<div class="tool-card-list">)[\s\S]*?(<\/div><\/section>)/;
  if (!cardListPattern.test(indexHtml)) throw new Error('index.html の tool-card-list を検出できません。');
  indexHtml = indexHtml.replace(cardListPattern, `$1${toolCards}$2`);
  await writeFile(indexPath, indexHtml);

  await writeFile(
    join(output, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${productionOrigin}/sitemap.xml\n`
  );

  const sitemapPaths = ['/', ...publishedTools.map((tool) => tool.path), '/privacy/', '/terms/'];
  const sitemapUrls = sitemapPaths
    .map((path) => `  <url><loc>${productionOrigin}${path}</loc></url>`)
    .join('\n');
  await writeFile(
    join(output, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls}\n</urlset>\n`
  );

  return { publishedTools, output };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildSite()
    .then(({ publishedTools }) => console.log(`Static site built in dist/ (${publishedTools.length} published tools).`))
    .catch((error) => {
      console.error(`build failed: ${error.message}`);
      process.exitCode = 1;
    });
}

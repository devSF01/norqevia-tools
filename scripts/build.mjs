import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const productionOrigin = 'https://tools.norqevia.com';
const output = new URL('../dist/', import.meta.url);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const path of ['index.html', 'assets', 'shared', 'text', 'csv', 'privacy', 'terms']) {
  await cp(new URL(`../${path}`, import.meta.url), new URL(path, output), { recursive: true });
}

const tools = JSON.parse(await readFile(new URL('../tools.json', import.meta.url), 'utf8'));
const publishedTools = tools
  .filter((tool) => tool.status === 'published')
  .sort((a, b) => a.number - b.number);

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const toolCards = publishedTools.map((tool) =>
  `<a class="tool-card" href="${escapeHtml(tool.path)}"><span class="category">${escapeHtml(tool.category)}</span><h3>${escapeHtml(tool.name)}</h3><p>${escapeHtml(tool.description)}</p><span class="card-link">ツールを開く →</span></a>`
).join('');

const indexPath = new URL('index.html', output);
let indexHtml = await readFile(indexPath, 'utf8');
const cardListPattern = /(<div class="tool-card-list">)[\s\S]*?(<\/div><\/section>)/;

if (!cardListPattern.test(indexHtml)) {
  throw new Error('index.html の tool-card-list を検出できません。');
}

indexHtml = indexHtml.replace(cardListPattern, `$1${toolCards}$2`);
await writeFile(indexPath, indexHtml);

await writeFile(
  new URL('robots.txt', output),
  `User-agent: *\nAllow: /\nSitemap: ${productionOrigin}/sitemap.xml\n`
);

const sitemapPaths = [
  '/',
  ...publishedTools.map((tool) => tool.path),
  '/privacy/',
  '/terms/'
];

const sitemapUrls = sitemapPaths
  .map((path) => `  <url><loc>${productionOrigin}${path}</loc></url>`)
  .join('\n');

await writeFile(
  new URL('sitemap.xml', output),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls}\n</urlset>\n`
);

console.log(`Static site built in dist/ (${publishedTools.length} published tools).`);
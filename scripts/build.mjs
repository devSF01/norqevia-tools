import { cp, mkdir, rm, writeFile } from 'node:fs/promises';

const output = new URL('../dist/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const path of ['index.html', 'assets', 'shared', 'text', 'csv', 'privacy', 'terms']) {
  await cp(new URL(`../${path}`, import.meta.url), new URL(path, output), { recursive: true });
}
await writeFile(new URL('robots.txt', output), 'User-agent: *\nAllow: /\nSitemap: https://tools.norqevia.com/sitemap.xml\n');
await writeFile(new URL('sitemap.xml', output), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://tools.norqevia.com/</loc></url>\n  <url><loc>https://tools.norqevia.com/text/list-compare/</loc></url>\n  <url><loc>https://tools.norqevia.com/csv/columns/</loc></url>\n  <url><loc>https://tools.norqevia.com/csv/duplicate-check/</loc></url>\n  <url><loc>https://tools.norqevia.com/privacy/</loc></url>\n  <url><loc>https://tools.norqevia.com/terms/</loc></url>\n</urlset>\n`);
console.log('Static site built in dist/.');

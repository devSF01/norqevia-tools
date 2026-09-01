import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const dist = new URL('../dist/', import.meta.url);

const tools = JSON.parse(await readFile(new URL('tools.json', root), 'utf8'));
const publishedTools = tools
  .filter((tool) => tool.status === 'published')
  .sort((a, b) => a.number - b.number);
const publishedCsvTools = publishedTools.filter((tool) => tool.category === 'CSV');

test('published Tool は tools.json の順序でトップページへ生成される', async () => {
  const indexHtml = await readFile(new URL('index.html', dist), 'utf8');

  let previousPosition = -1;

  for (const tool of publishedTools) {
    const href = `href="${tool.path}"`;
    const position = indexHtml.indexOf(href);

    assert.notEqual(position, -1, `${tool.name} がトップページにありません`);
    assert.ok(position > previousPosition, `${tool.name} の表示順が tools.json と一致しません`);

    previousPosition = position;
  }

  for (const tool of tools.filter((tool) => tool.status !== 'published')) {
    assert.equal(
      indexHtml.includes(`href="${tool.path}"`),
      false,
      `${tool.name} は未公開ですがトップページに含まれています`
    );
  }
});

test('published Tool のURLは sitemap.xml へ生成される', async () => {
  const sitemap = await readFile(new URL('sitemap.xml', dist), 'utf8');

  assert.equal(
    (sitemap.match(/<loc>https:\/\/tools\.norqevia\.com\/csv\/<\/loc>/g) || []).length,
    1,
    'CSVハブが sitemap.xml に1回だけありません'
  );
  assert.match(sitemap, /<loc>https:\/\/tools\.norqevia\.com\/privacy\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/tools\.norqevia\.com\/terms\/<\/loc>/);

  for (const tool of publishedTools) {
    assert.match(
      sitemap,
      new RegExp(`<loc>https://tools\\.norqevia\\.com${escapeRegExp(tool.path)}</loc>`),
      `${tool.name} が sitemap.xml にありません`
    );
  }

  for (const tool of tools.filter((tool) => tool.status !== 'published')) {
    assert.equal(
      sitemap.includes(`https://tools.norqevia.com${tool.path}`),
      false,
      `${tool.name} は未公開ですが sitemap.xml に含まれています`
    );
  }
});

test('CSVハブはpublished CSV Toolだけをregistryの情報から用途別に生成する', async () => {
  const hubHtml = await readFile(new URL('csv/index.html', dist), 'utf8');
  const hubToolLinks = [...hubHtml.matchAll(/<a class="tool-card" href="([^"]+)">/g)].map((match) => match[1]);

  assert.match(hubHtml, /<title>CSVツール一覧 \| 仕事データツール<\/title>/);
  assert.match(hubHtml, /<meta name="description" content="[^"]+">/);
  assert.match(hubHtml, /<link rel="canonical" href="https:\/\/tools\.norqevia\.com\/csv\/">/);
  assert.match(hubHtml, /<h1>CSVツール一覧<\/h1>/);
  assert.equal(hubToolLinks.length, publishedCsvTools.length);
  assert.equal(new Set(hubToolLinks).size, publishedCsvTools.length);
  assert.match(hubHtml, /<h2[^>]*>確認する<\/h2>/);
  assert.match(hubHtml, /<h2[^>]*>整理する<\/h2>/);
  assert.match(hubHtml, /<h2[^>]*>修正する<\/h2>/);
  assert.match(hubHtml, /<h2[^>]*>まとめる・分ける<\/h2>/);
  assert.match(hubHtml, /<h2[^>]*>変換する<\/h2>/);
  assert.equal(hubHtml.includes('/text/list-compare/'), false, 'Text ToolがCSVハブに混入しています');

  for (const tool of publishedCsvTools) {
    assert.equal(hubToolLinks.includes(tool.path), true, `${tool.name} がCSVハブにありません`);
    assert.equal(hubHtml.includes(`<h3>${tool.name}</h3>`), true, `${tool.name} の名前がregistryから再利用されていません`);
    assert.equal(hubHtml.includes(`<p>${tool.description}</p>`), true, `${tool.name} の説明がregistryから再利用されていません`);
  }
});

test('CSV Toolのbreadcrumbと共通headerは既存SEO要素を保ったままCSVハブへつながる', async () => {
  for (const tool of publishedCsvTools) {
    const pageHtml = await readFile(new URL(tool.path.slice(1) + 'index.html', dist), 'utf8');
    assert.match(
      pageHtml,
      new RegExp(`<a href="/">ホーム</a> \/ <a href="/csv/">CSVツール</a> \/ <span aria-current="page">${escapeRegExp(tool.name)}<\/span>`),
      `${tool.name} のbreadcrumbが不正です`
    );
    assert.match(pageHtml, new RegExp(`<link rel="canonical" href="https:\/\/tools\.norqevia\.com${escapeRegExp(tool.path)}">`));
    assert.match(pageHtml, new RegExp(`<h1>${escapeRegExp(tool.name)}<\/h1>`));
    assert.match(pageHtml, /<a href="\/csv\/">CSVツール<\/a>/);
  }
});

test('トップからCSVハブへの導線とpublished CSV Toolへの直接リンクを維持する', async () => {
  const indexHtml = await readFile(new URL('index.html', dist), 'utf8');
  assert.match(indexHtml, /<h3[^>]*>テキスト<\/h3>/);
  assert.match(indexHtml, /<h3[^>]*>CSVツール<\/h3>/);
  assert.match(indexHtml, /<a class="section-link" href="\/csv\/">CSVツールを一覧で見る →<\/a>/);
  for (const tool of publishedCsvTools) {
    assert.equal(indexHtml.includes(`href="${tool.path}"`), true, `${tool.name} のトップ直接リンクがありません`);
  }
});

test('共通headerは公開ページからCSVハブへつながる', async () => {
  const pagePaths = [
    'index.html',
    'csv/index.html',
    'text/list-compare/index.html',
    'privacy/index.html',
    'terms/index.html',
    ...publishedCsvTools.map((tool) => `${tool.path.slice(1)}index.html`)
  ];
  for (const pagePath of pagePaths) {
    const html = await readFile(new URL(pagePath, dist), 'utf8');
    assert.match(html, /<a href="\/csv\/">CSVツール<\/a>/, `${pagePath} にCSVハブへのheaderリンクがありません`);
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const dist = new URL('../dist/', import.meta.url);

const tools = JSON.parse(await readFile(new URL('tools.json', root), 'utf8'));
const publishedTools = tools
  .filter((tool) => tool.status === 'published')
  .sort((a, b) => a.number - b.number);

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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
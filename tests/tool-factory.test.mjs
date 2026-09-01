import assert from 'node:assert/strict';
import { lstat, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { buildSite } from '../scripts/build.mjs';
import { createTool } from '../scripts/create-tool-core.mjs';
import { parseArguments } from '../scripts/create-tool.mjs';
import { SCAFFOLD_MARKER } from '../scripts/tool-registry.mjs';

const templateRoot = fileURLToPath(new URL('../templates/tool/', import.meta.url));

async function makeWorkspace(initialTools = []) {
  const root = await mkdtemp(join(tmpdir(), 'norqevia-tool-factory-'));
  await Promise.all([
    mkdir(join(root, 'csv'), { recursive: true }),
    mkdir(join(root, 'text'), { recursive: true }),
    mkdir(join(root, 'shared'), { recursive: true }),
    mkdir(join(root, 'tests'), { recursive: true })
  ]);
  await writeFile(join(root, 'tools.json'), `${JSON.stringify(initialTools, null, 2)}\n`);
  return root;
}

async function pathExists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function makeBuildWorkspace(tools) {
  const root = await makeWorkspace();
  await Promise.all([
    writeFile(join(root, 'index.html'), '<section><div class="tool-index-groups"><!-- TOOL_INDEX_GROUPS --></div></section>'),
    writeFile(join(root, 'csv', 'index.html'), '<main><nav><a href="/">ホーム</a> / <span aria-current="page">CSVツール</span></nav><h1>CSVツール一覧</h1><div class="csv-hub-groups"><!-- CSV_HUB_TOOL_LINKS --></div></main>'),
    mkdir(join(root, 'assets'), { recursive: true }),
    mkdir(join(root, 'privacy'), { recursive: true }),
    mkdir(join(root, 'terms'), { recursive: true })
  ]);
  await Promise.all([
    writeFile(join(root, 'assets', 'site.css'), ''),
    writeFile(join(root, 'privacy', 'index.html'), '<h1>privacy</h1>'),
    writeFile(join(root, 'terms', 'index.html'), '<h1>terms</h1>'),
    writeFile(join(root, 'tools.json'), `${JSON.stringify(tools, null, 2)}\n`)
  ]);
  return root;
}

async function cleanup(root) {
  await rm(root, { recursive: true, force: true });
}

function csvSpec(overrides = {}) {
  return {
    id: 'csv-dedupe',
    number: 7,
    name: 'CSV重複行削除',
    category: 'CSV',
    template: 'csv',
    slug: 'dedupe',
    description: 'CSVから重複する行を確認できます。',
    ...overrides
  };
}

test('CSV scaffoldは4ファイルとdraft registry entryを生成し、値をescapeする', async () => {
  const existingTool = {
    id: 'text-existing',
    number: 1,
    name: '既存Tool',
    category: 'テキスト',
    path: '/text/existing/',
    description: '既存の説明です。',
    status: 'published'
  };
  const root = await makeWorkspace([existingTool]);
  try {
    const result = await createTool({
      rootDir: root,
      templateRoot,
      ...csvSpec({
        name: 'CSV <重複> "確認"',
        description: '説明 <安全> & "ローカル" {{LITERAL}}'
      })
    });
    const registry = JSON.parse(await readFile(join(root, 'tools.json'), 'utf8'));
    assert.deepEqual(registry[0], existingTool);
    assert.deepEqual(registry.at(-1), {
      id: 'csv-dedupe',
      number: 7,
      name: 'CSV <重複> "確認"',
      category: 'CSV',
      path: '/csv/dedupe/',
      description: '説明 <安全> & "ローカル" {{LITERAL}}',
      status: 'draft'
    });
    assert.equal(result.entry.status, 'draft');
    for (const path of Object.values(result.paths)) {
      const contents = await readFile(path, 'utf8');
      assert.match(contents, new RegExp(SCAFFOLD_MARKER));
    }
    const page = await readFile(join(root, 'csv', 'dedupe', 'index.html'), 'utf8');
    assert.match(page, /CSV &lt;重複&gt; &quot;確認&quot;/);
    assert.match(page, /説明 &lt;安全&gt; &amp; &quot;ローカル&quot; \{\{LITERAL\}\}/);
    assert.match(page, /https:\/\/tools\.norqevia\.com\/csv\/dedupe\//);
    assert.match(page, /\/shared\/csv-dedupe-app\.js/);
    assert.match(page, /csv-columns\.css/);
    assert.match(page, /<a href="\/csv\/">CSVツール<\/a>/);
    assert.match(page, /<a href="\/">ホーム<\/a> \/ <a href="\/csv\/">CSVツール<\/a> \/ <span/);
  } finally {
    await cleanup(root);
  }
});

test('Text scaffoldはtext視覚言語と期待pathを使う', async () => {
  const root = await makeWorkspace();
  try {
    const result = await createTool({
      rootDir: root,
      templateRoot,
      ...csvSpec({
        id: 'text-normalize',
        number: 8,
        name: 'テキスト整形',
        category: 'テキスト',
        template: 'text',
        slug: 'normalize-lines',
        description: 'テキストを確認できます。'
      })
    });
    assert.equal(result.entry.path, '/text/normalize-lines/');
    const page = await readFile(join(root, 'text', 'normalize-lines', 'index.html'), 'utf8');
    assert.match(page, /\/shared\/text-normalize-app\.js/);
    assert.match(page, /\/text\/normalize-lines\//);
    assert.doesNotMatch(page, /csv-columns\.css/);
    assert.match(await readFile(join(root, 'shared', 'text-normalize-core.js'), 'utf8'), /DOM非依存/);
  } finally {
    await cleanup(root);
  }
});

test('CLI parserは必須引数を要求し、published指定を受け付けない', () => {
  assert.throws(() => parseArguments(['--id', 'csv-test']), /必須オプション/);
  const forwardedArguments = parseArguments([
    '--', '--id', 'csv-test', '--number', '7', '--name', 'Test', '--category', 'CSV',
    '--template', 'csv', '--slug', 'test', '--description', 'desc'
  ]);
  assert.equal(forwardedArguments.id, 'csv-test');
  assert.equal(forwardedArguments.description, 'desc');
  assert.throws(() => parseArguments([
    '--id', 'csv-test', '--number', '7', '--name', 'Test', '--category', 'CSV',
    '--template', 'csv', '--slug', 'test', '--description', 'desc', '--status', 'published'
  ]), /不明なオプション/);
});

test('重複・不正入力・既存ファイル・壊れたregistryではmutationしない', async () => {
  const root = await makeWorkspace();
  try {
    await createTool({ rootDir: root, templateRoot, ...csvSpec() });
    const registryAfterFirst = await readFile(join(root, 'tools.json'), 'utf8');
    const failures = [
      csvSpec({ id: 'another-id', number: 8 }),
      csvSpec({ id: 'another-id', number: 7, slug: 'another-path' }),
      csvSpec({ id: 'another-id', number: 8, slug: 'dedupe' }),
      csvSpec({ id: 'bad/id', number: 8, slug: 'another-path' }),
      csvSpec({ id: 'another-id', number: 8, slug: '../outside' }),
      csvSpec({ id: 'another-id', number: 8, template: 'image', slug: 'another-path' }),
      csvSpec({ id: 'another-id', number: '0', slug: 'another-path' })
    ];
    for (const spec of failures) {
      await assert.rejects(() => createTool({ rootDir: root, templateRoot, ...spec }));
      assert.equal(await readFile(join(root, 'tools.json'), 'utf8'), registryAfterFirst);
    }
    const existingDirectory = join(root, 'text', 'existing');
    await mkdir(existingDirectory, { recursive: true });
    await assert.rejects(() => createTool({
      rootDir: root,
      templateRoot,
      ...csvSpec({ id: 'text-existing', number: 8, template: 'text', slug: 'existing' })
    }), /Tool directory/);
    assert.equal(await readFile(join(root, 'tools.json'), 'utf8'), registryAfterFirst);
    const existingCore = join(root, 'shared', 'existing-core-core.js');
    await writeFile(existingCore, 'keep');
    await assert.rejects(() => createTool({
      rootDir: root,
      templateRoot,
      ...csvSpec({ id: 'existing-core', number: 8, slug: 'another-path' })
    }), /shared core/);
    assert.equal(await readFile(existingCore, 'utf8'), 'keep');
    assert.equal(await readFile(join(root, 'tools.json'), 'utf8'), registryAfterFirst);
  } finally {
    await cleanup(root);
  }
});

test('壊れたtools.jsonと欠落テンプレートでは生成物を作らない', async () => {
  const root = await makeWorkspace();
  try {
    await writeFile(join(root, 'tools.json'), '{broken');
    await assert.rejects(() => createTool({ rootDir: root, templateRoot, ...csvSpec() }), /parse/);
    assert.equal(await pathExists(join(root, 'csv', 'dedupe')), false);

    await writeFile(join(root, 'tools.json'), '[]\n');
    const missingTemplateRoot = join(root, 'missing-templates');
    await mkdir(missingTemplateRoot, { recursive: true });
    await assert.rejects(() => createTool({ rootDir: root, templateRoot: missingTemplateRoot, ...csvSpec() }), /テンプレート/);
    assert.equal(await readFile(join(root, 'tools.json'), 'utf8'), '[]\n');
    assert.equal(await pathExists(join(root, 'csv', 'dedupe')), false);
  } finally {
    await cleanup(root);
  }
});

test('draftはdistへ出ず、publishedだけがdist・top・sitemapへ出る', async () => {
  const tools = [
    { id: 'draft-tool', number: 1, name: 'Draft', category: 'CSV', path: '/csv/draft-tool/', description: 'Draft', status: 'draft' },
    { id: 'published-tool', number: 2, name: 'Published', category: 'CSV', path: '/csv/published-tool/', description: 'Published', status: 'published' }
  ];
  const root = await makeBuildWorkspace(tools);
  try {
    await mkdir(join(root, 'csv', 'draft-tool'), { recursive: true });
    await writeFile(join(root, 'csv', 'draft-tool', 'index.html'), `${SCAFFOLD_MARKER}`);
    await mkdir(join(root, 'csv', 'published-tool'), { recursive: true });
    await writeFile(join(root, 'csv', 'published-tool', 'index.html'), '<h1>Published</h1>');
    const { output } = await buildSite({ rootDir: root, outputDir: join(root, 'dist') });
    assert.equal(await pathExists(join(output, 'csv', 'draft-tool')), false);
    assert.equal(await pathExists(join(output, 'csv', 'published-tool', 'index.html')), true);
    const index = await readFile(join(output, 'index.html'), 'utf8');
    const hub = await readFile(join(output, 'csv', 'index.html'), 'utf8');
    const sitemap = await readFile(join(output, 'sitemap.xml'), 'utf8');
    assert.equal(index.includes('/csv/draft-tool/'), false);
    assert.match(index, /\/csv\/published-tool\//);
    assert.equal(hub.includes('/csv/draft-tool/'), false);
    assert.match(hub, /<h2[^>]*>その他<\/h2>/);
    assert.match(hub, /\/csv\/published-tool\//);
    assert.equal(sitemap.includes('/csv/draft-tool/'), false);
    assert.equal((sitemap.match(/<loc>https:\/\/tools\.norqevia\.com\/csv\/<\/loc>/g) || []).length, 1);
    assert.match(sitemap, /https:\/\/tools\.norqevia\.com\/csv\/published-tool\//);
  } finally {
    await cleanup(root);
  }
});

test('publishedのmarker・source directory欠落・危険pathはdist更新前にfailする', async () => {
  const markerRoot = await makeBuildWorkspace([]);
  try {
    await createTool({ rootDir: markerRoot, templateRoot, ...csvSpec() });
    const registry = JSON.parse(await readFile(join(markerRoot, 'tools.json'), 'utf8'));
    registry[0].status = 'published';
    await writeFile(join(markerRoot, 'tools.json'), JSON.stringify(registry, null, 2));
    await mkdir(join(markerRoot, 'dist'), { recursive: true });
    await writeFile(join(markerRoot, 'dist', 'sentinel.txt'), 'keep');
    await assert.rejects(() => buildSite({ rootDir: markerRoot, outputDir: join(markerRoot, 'dist') }), /marker/);
    assert.equal(await readFile(join(markerRoot, 'dist', 'sentinel.txt'), 'utf8'), 'keep');
  } finally {
    await cleanup(markerRoot);
  }

  const hubMarkerRoot = await makeBuildWorkspace([
    { id: 'published-tool', number: 2, name: 'Published', category: 'CSV', path: '/csv/published-tool/', description: 'Published', status: 'published' }
  ]);
  try {
    await mkdir(join(hubMarkerRoot, 'csv', 'published-tool'), { recursive: true });
    await writeFile(join(hubMarkerRoot, 'csv', 'published-tool', 'index.html'), '<h1>Published</h1>');
    await writeFile(join(hubMarkerRoot, 'csv', 'index.html'), '<main><h1>CSVツール一覧</h1></main>');
    await mkdir(join(hubMarkerRoot, 'dist'), { recursive: true });
    await writeFile(join(hubMarkerRoot, 'dist', 'sentinel.txt'), 'keep');
    await assert.rejects(() => buildSite({ rootDir: hubMarkerRoot, outputDir: join(hubMarkerRoot, 'dist') }), /CSV_HUB_TOOL_LINKS/);
    assert.equal(await readFile(join(hubMarkerRoot, 'dist', 'sentinel.txt'), 'utf8'), 'keep');
  } finally {
    await cleanup(hubMarkerRoot);
  }

  const missingRoot = await makeBuildWorkspace([
    { id: 'missing-tool', number: 1, name: 'Missing', category: 'CSV', path: '/csv/missing-tool/', description: 'Missing', status: 'published' }
  ]);
  try {
    await assert.rejects(() => buildSite({ rootDir: missingRoot, outputDir: join(missingRoot, 'dist') }), /source directory/);
  } finally {
    await cleanup(missingRoot);
  }

  const unsafeRoot = await makeBuildWorkspace([
    { id: 'unsafe-tool', number: 1, name: 'Unsafe', category: 'CSV', path: '/csv/../outside/', description: 'Unsafe', status: 'draft' }
  ]);
  try {
    await assert.rejects(() => buildSite({ rootDir: unsafeRoot, outputDir: join(unsafeRoot, 'dist') }), /path/);
  } finally {
    await cleanup(unsafeRoot);
  }
});

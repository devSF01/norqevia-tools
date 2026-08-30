import { lstat, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCAFFOLD_MARKER,
  assertNonEmptyString,
  createToolPath,
  parsePositiveInteger,
  validateSlug,
  validateTemplate,
  validateToolId,
  validateToolsRegistry
} from './tool-registry.mjs';

const defaultRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const defaultTemplateRoot = resolve(defaultRoot, 'templates', 'tool');
const templateFiles = {
  index: 'index.html.tpl',
  core: 'core.js.tpl',
  app: 'app.js.tpl',
  test: 'test.mjs.tpl'
};

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function escapeJavaScriptString(value) {
  return JSON.stringify(String(value)).replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
}

export function renderTemplate(template, replacements) {
  return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (placeholder, key) => {
    if (!Object.hasOwn(replacements, key)) throw new Error(`テンプレートに未解決のplaceholderがあります: ${placeholder}`);
    return String(replacements[key]);
  });
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

async function readTemplate(templateRoot, template, fileName) {
  const path = join(templateRoot, template, fileName);
  try {
    const details = await lstat(path);
    if (!details.isFile()) throw new Error(`必須テンプレートが通常ファイルではありません: ${path}`);
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`必須テンプレートが見つかりません: ${path}`);
    throw error;
  }
}

async function assertAbsent(path, label) {
  if (await exists(path)) throw new Error(`${label} が既に存在するため生成を中止しました: ${path}`);
}

function normalizeSpec(input) {
  const id = validateToolId(input.id);
  const number = parsePositiveInteger(input.number);
  const name = assertNonEmptyString(input.name, 'name');
  const category = assertNonEmptyString(input.category, 'category');
  const template = validateTemplate(input.template);
  const slug = validateSlug(input.slug);
  const description = assertNonEmptyString(input.description, 'description');
  return { id, number, name, category, template, slug, description };
}

export async function createTool({
  rootDir = defaultRoot,
  templateRoot = defaultTemplateRoot,
  ...input
}) {
  const spec = normalizeSpec(input);
  const root = resolve(rootDir);
  const templates = resolve(templateRoot);
  const registryPath = join(root, 'tools.json');
  let registryText;
  let tools;

  try {
    registryText = await readFile(registryPath, 'utf8');
    tools = JSON.parse(registryText);
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(`tools.json をparseできません: ${error.message}`);
    if (error.code === 'ENOENT') throw new Error(`tools.json が見つかりません: ${registryPath}`);
    throw error;
  }
  validateToolsRegistry(tools);

  const path = createToolPath(spec.template, spec.slug);
  if (tools.some((tool) => tool.id === spec.id)) throw new Error(`Tool id が既に存在します: ${spec.id}`);
  if (tools.some((tool) => tool.number === spec.number)) throw new Error(`Tool number が既に存在します: ${spec.number}`);
  if (tools.some((tool) => tool.path === path)) throw new Error(`Tool path が既に存在します: ${path}`);

  const toolDirectory = join(root, spec.template, spec.slug);
  const outputPaths = {
    page: join(toolDirectory, 'index.html'),
    core: join(root, 'shared', `${spec.id}-core.js`),
    app: join(root, 'shared', `${spec.id}-app.js`),
    test: join(root, 'tests', `${spec.id}.test.mjs`)
  };

  await assertAbsent(toolDirectory, 'Tool directory');
  await assertAbsent(outputPaths.page, 'Tool page');
  await assertAbsent(outputPaths.core, 'shared core');
  await assertAbsent(outputPaths.app, 'shared app');
  await assertAbsent(outputPaths.test, 'unit test');

  const sourceTemplates = await Promise.all(Object.values(templateFiles).map((fileName) => readTemplate(templates, spec.template, fileName)));
  const [indexTemplate, coreTemplate, appTemplate, testTemplate] = sourceTemplates;
  const replacements = {
    ID_HTML: escapeHtml(spec.id),
    ID_JS: escapeJavaScriptString(spec.id),
    NAME_HTML: escapeHtml(spec.name),
    NAME_JS: escapeJavaScriptString(spec.name),
    CATEGORY_HTML: escapeHtml(spec.category),
    DESCRIPTION_HTML: escapeHtml(spec.description),
    PATH_HTML: escapeHtml(path),
    NUMBER_TEXT: String(spec.number),
    SCAFFOLD_MARKER
  };
  const renderedFiles = {
    page: renderTemplate(indexTemplate, replacements),
    core: renderTemplate(coreTemplate, replacements),
    app: renderTemplate(appTemplate, replacements),
    test: renderTemplate(testTemplate, replacements)
  };
  const registryEntry = {
    id: spec.id,
    number: spec.number,
    name: spec.name,
    category: spec.category,
    path,
    description: spec.description,
    status: 'draft'
  };
  const nextRegistryText = `${JSON.stringify([...tools, registryEntry], null, 2)}\n`;

  const writtenFiles = [];
  let toolDirectoryCreated = false;
  try {
    await mkdir(toolDirectory, { recursive: false });
    toolDirectoryCreated = true;
    for (const [key, pathToWrite] of Object.entries(outputPaths)) {
      await mkdir(dirname(pathToWrite), { recursive: true });
      await writeFile(pathToWrite, renderedFiles[key], { encoding: 'utf8', flag: 'wx' });
      writtenFiles.push(pathToWrite);
    }
    await writeFile(registryPath, nextRegistryText, 'utf8');
  } catch (error) {
    for (const pathToRemove of writtenFiles.reverse()) await rm(pathToRemove, { force: true });
    if (toolDirectoryCreated) await rm(toolDirectory, { recursive: true, force: true });
    try {
      const currentRegistryText = await readFile(registryPath, 'utf8');
      if (currentRegistryText !== registryText) await writeFile(registryPath, registryText, 'utf8');
    } catch {
      // Preserve the original error. Validation has already completed before mutation.
    }
    throw error;
  }

  return { entry: registryEntry, paths: outputPaths };
}

export { SCAFFOLD_MARKER };

export const SCAFFOLD_MARKER = 'TOOL_SCAFFOLD_TODO';
export const TOOL_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SUPPORTED_TEMPLATES = new Set(['csv', 'text']);

export function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} は空にできません。`);
  }
  return value;
}

export function validateToolId(id, label = 'id') {
  assertNonEmptyString(id, label);
  if (!TOOL_ID_PATTERN.test(id)) {
    throw new Error(`${label} は小文字英数字とハイフンのみで指定してください。`);
  }
  return id;
}

export function validateSlug(slug) {
  return validateToolId(slug, 'slug');
}

export function validateTemplate(template) {
  if (typeof template !== 'string' || !SUPPORTED_TEMPLATES.has(template)) {
    throw new Error(`template は ${[...SUPPORTED_TEMPLATES].join(' / ')} のいずれかを指定してください。`);
  }
  return template;
}

export function parsePositiveInteger(value, label = 'number') {
  const text = String(value ?? '');
  if (!/^[1-9]\d*$/.test(text)) {
    throw new Error(`${label} は正の整数で指定してください。`);
  }
  const number = Number(text);
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new Error(`${label} は安全な範囲の正の整数で指定してください。`);
  }
  return number;
}

export function validateSitePath(path) {
  assertNonEmptyString(path, 'path');
  if (!path.startsWith('/') || !path.endsWith('/')) {
    throw new Error(`path は末尾のスラッシュを含むサイト内絶対pathで指定してください: ${path}`);
  }
  if (
    path.startsWith('//') ||
    path.includes('\\') ||
    path.includes('..') ||
    path.includes('%') ||
    path.includes('?') ||
    path.includes('#') ||
    path.includes(':') ||
    /[\u0000-\u0020\u007f]/.test(path)
  ) {
    throw new Error(`path に危険な文字またはURL外部参照を含めることはできません: ${path}`);
  }

  const segments = path.split('/').slice(1, -1);
  if (segments.length === 0 || segments.some((segment) => !TOOL_ID_PATTERN.test(segment))) {
    throw new Error(`path の各セグメントは小文字英数字とハイフンで指定してください: ${path}`);
  }
  return segments;
}

export function createToolPath(template, slug) {
  validateTemplate(template);
  validateSlug(slug);
  return `/${template}/${slug}/`;
}

export function validateToolsRegistry(tools) {
  if (!Array.isArray(tools)) {
    throw new Error('tools.json はTool配列である必要があります。');
  }

  const ids = new Set();
  const numbers = new Set();
  const paths = new Set();

  tools.forEach((tool, index) => {
    const label = `tools.json[${index}]`;
    if (!tool || typeof tool !== 'object' || Array.isArray(tool)) {
      throw new Error(`${label} はオブジェクトである必要があります。`);
    }
    const id = validateToolId(tool.id, `${label}.id`);
    const number = parsePositiveInteger(tool.number, `${label}.number`);
    const path = validateSitePath(tool.path);
    assertNonEmptyString(tool.name, `${label}.name`);
    assertNonEmptyString(tool.category, `${label}.category`);
    assertNonEmptyString(tool.description, `${label}.description`);
    assertNonEmptyString(tool.status, `${label}.status`);

    if (ids.has(id)) throw new Error(`Tool id が重複しています: ${id}`);
    if (numbers.has(number)) throw new Error(`Tool number が重複しています: ${number}`);
    if (paths.has(path)) throw new Error(`Tool path が重複しています: ${path}`);
    ids.add(id);
    numbers.add(number);
    paths.add(path);
  });

  return tools;
}

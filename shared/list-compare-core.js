/** Pure comparison logic. This module never performs I/O or network access. */
export function parseList(text, options) {
  const lines = String(text ?? '').split(/\r?\n/);
  const entries = [];
  let validLines = 0;
  for (const originalValue of lines) {
    const blank = originalValue.trim() === '';
    if (options.ignoreEmptyLines && blank) continue;
    validLines += 1;
    const comparable = options.trimWhitespace ? originalValue.trim() : originalValue;
    const key = options.caseSensitive ? comparable : comparable.toLowerCase();
    entries.push({ key, originalValue });
  }
  const unique = [];
  const byKey = new Map();
  for (const entry of entries) {
    if (!byKey.has(entry.key)) {
      byKey.set(entry.key, entry);
      unique.push(entry);
    }
  }
  return {
    inputLines: text === '' ? 0 : lines.length,
    validLines,
    unique,
    byKey,
    duplicates: validLines - unique.length
  };
}

export function compareLists(aText, bText, options) {
  const a = parseList(aText, options);
  const b = parseList(bText, options);
  const aOnly = a.unique.filter((entry) => !b.byKey.has(entry.key));
  const both = a.unique.filter((entry) => b.byKey.has(entry.key));
  const bOnly = b.unique.filter((entry) => !a.byKey.has(entry.key));
  return { a, b, aOnly, both, bOnly };
}

export const values = (entries) => entries.map((entry) => entry.originalValue);

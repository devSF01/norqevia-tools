import { CsvError, validateCsv } from './csv-columns-core.js';

/** Replaces only the header row, preserving every data value and row order. */
export function renameCsvHeaders(records, newHeaders) {
  const { headers, dataRows } = validateCsv(records);
  if (!Array.isArray(newHeaders) || newHeaders.length !== headers.length) {
    throw new CsvError('新しい列名の数が元の列数と一致しません。');
  }
  if (newHeaders.some((header) => typeof header !== 'string')) {
    throw new CsvError('新しい列名は文字列で指定してください。');
  }
  return [newHeaders.slice(), ...dataRows.map((row) => row.slice())];
}

import { CsvError, validateCsv } from './csv-columns-core.js';

/** Filters data rows by exact string equality while preserving row order. */
export function filterCsvRecords(records, columnIndex, operator, value) {
  const { headers, dataRows } = validateCsv(records);
  if (!Number.isSafeInteger(columnIndex) || columnIndex < 0 || columnIndex >= headers.length) {
    throw new CsvError('絞り込む列が不正です。');
  }
  if (operator !== 'equals' && operator !== 'not-equals') {
    throw new CsvError('絞り込み条件が不正です。');
  }
  if (typeof value !== 'string') throw new CsvError('比較値が不正です。');

  const matches = dataRows.filter((row) => operator === 'equals'
    ? row[columnIndex] === value
    : row[columnIndex] !== value);
  return [headers.slice(), ...matches.map((row) => row.slice())];
}

import { CsvError, validateCsv } from './csv-columns-core.js';

/**
 * Sorts data rows by one string-valued column without changing the source records.
 * The original index is used as an explicit tie breaker so equal keys stay stable
 * even when this logic is run in a JavaScript environment with a different sort
 * implementation.
 */
export function sortCsvRecords(records, columnIndex, direction) {
  if (!Array.isArray(records)) throw new CsvError('CSVにヘッダー行がありません。');

  const { headers, dataRows } = validateCsv(records);
  if (!Number.isSafeInteger(columnIndex) || columnIndex < 0 || columnIndex >= headers.length) {
    throw new CsvError('並べ替え列が不正です。');
  }
  if (direction !== 'asc' && direction !== 'desc') {
    throw new CsvError('並べ替え方向が不正です。');
  }

  const indexedRows = dataRows.map((row, index) => ({ row: row.slice(), index }));
  indexedRows.sort((left, right) => {
    const leftValue = left.row[columnIndex];
    const rightValue = right.row[columnIndex];
    const comparison = leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
    if (comparison !== 0) return direction === 'asc' ? comparison : -comparison;
    return left.index - right.index;
  });

  return [headers.slice(), ...indexedRows.map(({ row }) => row)];
}

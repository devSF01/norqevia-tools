import { CsvError } from './csv-columns-core.js';
import { findDuplicateGroups } from './csv-duplicate-core.js';

/** Removes later occurrences of duplicate keys while preserving the first row. */
export function removeDuplicateRows(records, selectedIndexes) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new CsvError('CSVにヘッダー行がありません。');
  }
  if (!Array.isArray(selectedIndexes) || selectedIndexes.length === 0) {
    throw new CsvError('重複判定に使う列を1つ以上選択してください。');
  }

  const duplicateResult = findDuplicateGroups(records, selectedIndexes);
  const laterDuplicateRows = new Set(
    duplicateResult.groups.flatMap((group) =>
      group.rows.filter((row) => !row.isFirst).map((row) => row.dataRowNumber)
    )
  );
  const dataRows = records.slice(1);
  const keptRows = dataRows
    .filter((_, index) => !laterDuplicateRows.has(index + 1))
    .map((row) => row.slice());

  const headers = records[0].slice();
  const outputRecords = [headers, ...keptRows];
  return {
    headers,
    records: outputRecords,
    dataRows: keptRows,
    originalDataRowCount: duplicateResult.dataRowCount,
    remainingDataRowCount: keptRows.length,
    removedDataRowCount: laterDuplicateRows.size,
    duplicateGroupCount: duplicateResult.duplicateGroupCount,
    duplicateRowCount: duplicateResult.duplicateRowCount,
    dataRowCount: duplicateResult.dataRowCount,
    keptRowCount: keptRows.length,
    removedRowCount: laterDuplicateRows.size
  };
}

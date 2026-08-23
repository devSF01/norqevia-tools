import { CsvError } from './csv-columns-core.js';

/** Finds duplicate CSV records without transforming any field values. */
export function findDuplicateGroups(records, selectedIndexes) {
  if (selectedIndexes.length === 0) throw new CsvError('重複判定に使う列を1つ以上選択してください。');
  const groupsByKey = new Map();
  records.slice(1).forEach((values, index) => {
    const keyValues = selectedIndexes.map((column) => values[column]);
    const key = JSON.stringify(keyValues);
    const group = groupsByKey.get(key) || { keyValues, rows: [] };
    group.rows.push({ values, recordNumber: index + 2, dataRowNumber: index + 1, isFirst: group.rows.length === 0 });
    groupsByKey.set(key, group);
  });
  const groups = [...groupsByKey.values()];
  const duplicates = groups.filter((group) => group.rows.length > 1);
  const duplicateRecordNumbers = new Set(duplicates.flatMap((group) => group.rows.map((row) => row.recordNumber)));
  return {
    dataRowCount: records.length - 1,
    uniqueKeyCount: groups.length,
    duplicateGroupCount: duplicates.length,
    duplicateRowCount: duplicates.reduce((total, group) => total + group.rows.length, 0),
    groups: duplicates,
    duplicateRecords: [records[0], ...records.slice(1).filter((_, index) => duplicateRecordNumbers.has(index + 2))]
  };
}

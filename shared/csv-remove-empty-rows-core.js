import { CsvError } from './csv-columns-core.js';

/** Removes only data records whose every parsed field is an empty string. */
export function removeEmptyRows(records) {
  if (records.length === 0) throw new CsvError('CSVにヘッダー行がありません。');

  const [headers, ...dataRows] = records;
  const keptRows = dataRows.filter((row) => !row.every((value) => value === ''));

  return {
    records: [headers, ...keptRows],
    dataRowCount: dataRows.length,
    keptRowCount: keptRows.length,
    removedRowCount: dataRows.length - keptRows.length
  };
}

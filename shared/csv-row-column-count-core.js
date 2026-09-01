import { CsvError, columnLabel, validateCsv } from './csv-columns-core.js';

/** Counts validated CSV records without changing the source arrays. */
export function countCsvRowsAndColumns(records) {
  if (!Array.isArray(records)) throw new CsvError('CSVにヘッダー行がありません。');
  const { headers, dataRows, columnCount } = validateCsv(records);
  return {
    headers: headers.slice(),
    headerLabels: headers.map((_, index) => columnLabel(headers, index)),
    columnCount,
    dataRowCount: dataRows.length,
    recordCount: records.length
  };
}

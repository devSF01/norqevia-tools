import { CsvError, validateCsv } from './csv-columns-core.js';

/** Splits parsed CSV records into parts without changing any field value. */
export function splitCsvRecords(records, rowsPerFile) {
  if (!Number.isSafeInteger(rowsPerFile) || rowsPerFile < 1) {
    throw new CsvError('1ファイルあたりのデータ行数は1以上の安全な整数で指定してください。');
  }

  const { headers: sourceHeaders, dataRows: sourceDataRows } = validateCsv(records);
  const headers = sourceHeaders.slice();
  const dataRows = sourceDataRows.map((row) => row.slice());
  const parts = [];

  for (let start = 0; start < dataRows.length; start += rowsPerFile) {
    parts.push([headers.slice(), ...dataRows.slice(start, start + rowsPerFile)]);
  }

  if (parts.length === 0) parts.push([headers.slice()]);

  return {
    parts,
    headers,
    dataRowCount: dataRows.length,
    rowsPerFile,
    partCount: parts.length
  };
}

import { CsvError, validateCsv } from './csv-columns-core.js';

/**
 * Combines two or more parsed CSV documents without changing any field value.
 * Each document must have the same header (including its column order).
 */
export function mergeCsvRecords(recordSets) {
  if (!Array.isArray(recordSets) || recordSets.length < 2) {
    throw new CsvError('CSVファイルを2つ以上選択してください。');
  }

  const validated = recordSets.map((records, index) => {
    if (!Array.isArray(records)) {
      throw new CsvError(`${index + 1}番目のCSVを読み込めませんでした。`);
    }
    try {
      return validateCsv(records);
    } catch (error) {
      if (error instanceof CsvError) {
        throw new CsvError(`${index + 1}番目のCSV: ${error.message}`);
      }
      throw error;
    }
  });

  const referenceHeaders = validated[0].headers;
  for (let index = 1; index < validated.length; index += 1) {
    const headers = validated[index].headers;
    const matches = headers.length === referenceHeaders.length
      && headers.every((value, headerIndex) => value === referenceHeaders[headerIndex]);
    if (!matches) {
      throw new CsvError(`${index + 1}番目のCSVのヘッダーが1番目のCSVと一致しません。列数・列順・見出しを確認してください。`);
    }
  }

  const dataRows = validated.flatMap(({ dataRows: rows }) => rows.map((row) => row.slice()));
  const headers = referenceHeaders.slice();
  return {
    records: [headers, ...dataRows],
    headers,
    dataRows,
    fileCount: validated.length,
    columnCount: headers.length,
    dataRowCount: dataRows.length
  };
}

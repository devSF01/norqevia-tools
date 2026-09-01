import { CsvError, columnLabel, validateCsv } from './csv-columns-core.js';

function assertStringRecords(records) {
  for (const row of records) {
    if (row.some((value) => typeof value !== 'string')) {
      throw new CsvError('CSVの値は文字列として読み込まれている必要があります。');
    }
  }
}

function validateUniqueHeaders(headers) {
  const seen = new Set();
  headers.forEach((header, index) => {
    if (seen.has(header)) {
      throw new CsvError(`JSON変換には重複したヘッダーを使用できません。${columnLabel(headers, index)}が重複しています。`);
    }
    seen.add(header);
  });
}

/** Converts data rows to objects using the CSV header order as JSON key order. */
export function csvRecordsToObjects(records) {
  const { headers, dataRows } = validateCsv(records);
  assertStringRecords(records);
  validateUniqueHeaders(headers);

  return dataRows.map((row) => {
    const object = {};
    headers.forEach((header, index) => {
      Object.defineProperty(object, header, {
        configurable: true,
        enumerable: true,
        value: row[index],
        writable: true
      });
    });
    return object;
  });
}

/** Pretty-prints JSON objects with a stable final newline and explicit key order. */
export function serializeJsonObjects(data, headers) {
  return `${JSON.stringify(data, headers, 2)}\n`;
}

/** Converts records and pretty-prints the result as JSON. */
export function csvRecordsToJson(records) {
  const { headers } = validateCsv(records);
  return serializeJsonObjects(csvRecordsToObjects(records), headers);
}

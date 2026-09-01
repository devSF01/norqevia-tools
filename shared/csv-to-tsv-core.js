import { CsvError, serializeDelimited, validateCsv } from './csv-columns-core.js';

/** Serializes validated CSV records as UTF-8 BOM-prefixed, CRLF TSV text. */
export function serializeTsv(records) {
  if (!Array.isArray(records)) throw new CsvError('CSVにヘッダー行がありません。');
  validateCsv(records);
  if (records.some((row) => row.some((value) => typeof value !== 'string'))) {
    throw new CsvError('CSVの値は文字列として読み込まれている必要があります。');
  }
  return `\uFEFF${serializeDelimited(records, '\t')}`;
}

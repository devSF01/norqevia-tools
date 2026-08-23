/** CSV parsing and column extraction that preserve every field as a string. */
export class CsvError extends Error {}

export function decodeUtf8(bytes) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
  } catch {
    throw new CsvError('このファイルはUTF-8として読み込めませんでした。現在このツールはUTF-8形式のCSVに対応しています。');
  }
}

export function parseCsv(text) {
  if (text === '') return [];
  const records = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let afterQuote = false;
  let fieldStarted = false;

  const endRecord = () => { row.push(field); records.push(row); row = []; field = ''; fieldStarted = false; afterQuote = false; };
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') { field += '"'; index += 1; }
        else { inQuotes = false; afterQuote = true; }
      } else { field += char; }
      continue;
    }
    if (afterQuote && char !== ',' && char !== '\r' && char !== '\n') throw new CsvError('CSVの引用符の後に不正な文字があります。');
    if (char === ',') { row.push(field); field = ''; fieldStarted = false; afterQuote = false; continue; }
    if (char === '\r' || char === '\n') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      endRecord();
      continue;
    }
    if (char === '"') {
      if (fieldStarted) throw new CsvError('CSVの引用符の位置が不正です。');
      inQuotes = true; fieldStarted = true; continue;
    }
    field += char; fieldStarted = true;
  }
  if (inQuotes) throw new CsvError('CSVの引用符が閉じられていません。');
  if (fieldStarted || row.length > 0) { row.push(field); records.push(row); }
  return records;
}

export function validateCsv(records) {
  if (records.length === 0) throw new CsvError('CSVにヘッダー行がありません。');
  const columnCount = records[0].length;
  for (let index = 1; index < records.length; index += 1) {
    if (records[index].length !== columnCount) {
      throw new CsvError(`CSVの列数が一致していない行があります。\n${index + 1}行目: ヘッダーは${columnCount}列ですが、この行は${records[index].length}列です。`);
    }
  }
  return { headers: records[0], dataRows: records.slice(1), columnCount };
}

export function extractColumns(records, selectedIndexes) {
  if (selectedIndexes.length === 0) throw new CsvError('残す列を1つ以上選択してください。');
  return records.map((row) => selectedIndexes.map((index) => row[index]));
}

export function serializeCsv(records) {
  const escape = (value) => {
    const field = String(value);
    return /[",\r\n]/.test(field) ? `"${field.replaceAll('"', '""')}"` : field;
  };
  return records.map((row) => row.map(escape).join(',')).join('\r\n');
}

export function createUtf8BomCsv(records) { return `\uFEFF${serializeCsv(records)}`; }

export function outputFilename(inputName, suffix = 'columns') {
  const stem = String(inputName || 'columns').replace(/\.csv$/i, '') || 'columns';
  return `${stem}-${suffix}.csv`;
}

export function columnLabel(headers, index) {
  const header = headers[index] || '（空の見出し）';
  return headers.filter((value) => value === headers[index]).length > 1 ? `${header}（${index + 1}列目）` : header;
}

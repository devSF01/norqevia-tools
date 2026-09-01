import { CsvError, decodeUtf8, outputFilenameWithExtension, parseCsv, validateCsv } from './csv-columns-core.js';
import { csvRecordsToObjects, serializeJsonObjects } from './csv-to-json-core.js';

const JSON_PREVIEW_DATA_ROW_LIMIT = 5;
const $ = (id) => document.getElementById(id);
let sourceFile = null;
let sourceRecords = null;
let outputText = null;
let outputName = null;
let readVersion = 0;

function notice(message, error = false) {
  $('json-notice').textContent = message;
  $('json-notice').classList.toggle('error', error);
}

function resetResult() {
  outputText = null;
  outputName = null;
  $('json-result').hidden = true;
  $('save-json').disabled = true;
  $('json-preview').textContent = '';
  $('json-preview-note').textContent = '';
}

function clearInputState() {
  sourceFile = null;
  sourceRecords = null;
  resetResult();
  $('json-summary').hidden = true;
  $('json-convert-button').disabled = true;
}

async function readFile() {
  const version = readVersion + 1;
  readVersion = version;
  const file = $('json-file').files?.[0] || null;
  clearInputState();

  if (!file) {
    notice('CSVファイルを選択してください。', true);
    return;
  }

  try {
    const records = parseCsv(decodeUtf8(await file.arrayBuffer()));
    const details = validateCsv(records);
    if (version !== readVersion || $('json-file').files?.[0] !== file) return;

    sourceFile = file;
    sourceRecords = records;
    $('json-file-name').textContent = file.name;
    $('json-file-size').textContent = `${file.size.toLocaleString('ja-JP')} bytes`;
    $('json-column-count').textContent = details.columnCount.toLocaleString('ja-JP');
    $('json-data-row-count').textContent = details.dataRows.length.toLocaleString('ja-JP');
    $('json-summary').hidden = false;
    $('json-convert-button').disabled = false;
    notice('内容を確認し、「JSONに変換」を押してください。重複ヘッダーは変換時に停止します。');
  } catch (error) {
    if (version !== readVersion || $('json-file').files?.[0] !== file) return;
    notice(error instanceof CsvError ? error.message : 'CSVを読み込めませんでした。', true);
  }
}

function processConvert() {
  if (!sourceRecords || !sourceFile) {
    notice('先にCSVファイルを選択してください。', true);
    return;
  }

  resetResult();
  try {
    const data = csvRecordsToObjects(sourceRecords);
    const headers = sourceRecords[0];
    outputText = serializeJsonObjects(data, headers);
    outputName = outputFilenameWithExtension(sourceFile.name, 'json');
    $('json-result-row-count').textContent = data.length.toLocaleString('ja-JP');
    $('json-preview').textContent = serializeJsonObjects(data.slice(0, JSON_PREVIEW_DATA_ROW_LIMIT), headers);
    $('json-preview-note').textContent = data.length > JSON_PREVIEW_DATA_ROW_LIMIT
      ? `先頭${JSON_PREVIEW_DATA_ROW_LIMIT}件のJSONを表示しています。保存するJSONには全${data.length.toLocaleString('ja-JP')}件を含みます。`
      : `変換後の${data.length.toLocaleString('ja-JP')}件を表示しています。`;
    $('json-result').hidden = false;
    $('save-json').disabled = false;
    notice('JSONに変換しました。内容を確認してファイルを保存してください。');
  } catch (error) {
    notice(error instanceof CsvError ? error.message : 'JSONに変換できませんでした。', true);
  }
}

function saveJson() {
  if (!outputText || !outputName) return;
  const blob = new Blob([outputText], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = outputName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

document.addEventListener('DOMContentLoaded', () => {
  $('json-file').addEventListener('change', () => { void readFile(); });
  $('json-convert-button').addEventListener('click', processConvert);
  $('save-json').addEventListener('click', saveJson);
});

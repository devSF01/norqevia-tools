import { CsvError, columnLabel, createUtf8BomCsv, decodeUtf8, outputFilename, parseCsv, validateCsv } from './csv-columns-core.js';
import { createCsvPreviewTable } from './csv-tool-ui.js';
import { renameCsvHeaders } from './csv-rename-columns-core.js';

const $ = (id) => document.getElementById(id);
let sourceFile = null;
let sourceRecords = null;
let outputRecords = null;
let outputName = null;
let readVersion = 0;

function notice(message, error = false) {
  $('rename-notice').textContent = message;
  $('rename-notice').classList.toggle('error', error);
}

function resetResult() {
  outputRecords = null;
  outputName = null;
  $('rename-result').hidden = true;
  $('save-renamed-csv').disabled = true;
  $('rename-preview').replaceChildren();
  $('rename-preview-note').textContent = '';
}

function clearInputState() {
  sourceFile = null;
  sourceRecords = null;
  resetResult();
  $('rename-summary').hidden = true;
  $('rename-editor-area').hidden = true;
  $('rename-button').disabled = true;
  $('rename-column-editor').replaceChildren();
}

function renderEditor(headers) {
  const table = document.createElement('table');
  table.className = 'csv-editor';
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const value of ['列番号', '現在の列名', '新しい列名']) {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = value;
    headRow.append(cell);
  }
  head.append(headRow);
  table.append(head);

  const body = document.createElement('tbody');
  headers.forEach((header, index) => {
    const row = document.createElement('tr');
    const numberCell = document.createElement('td');
    numberCell.textContent = `${index + 1}列目`;
    const currentCell = document.createElement('td');
    currentCell.textContent = columnLabel(headers, index);
    const inputCell = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'rename-header';
    input.value = header;
    input.setAttribute('aria-label', `${columnLabel(headers, index)}の新しい列名`);
    inputCell.append(input);
    row.append(numberCell, currentCell, inputCell);
    body.append(row);
  });
  table.append(body);
  $('rename-column-editor').replaceChildren(table);
}

function renderPreview(records) {
  $('rename-preview').replaceChildren(createCsvPreviewTable(records));
  const previewCount = Math.min(records.length - 1, 20);
  $('rename-preview-note').textContent = previewCount === 0
    ? 'データ行はありません。ヘッダーだけを表示しています。'
    : `変更後の先頭${previewCount}データ行を表示しています。`;
}

async function readFile() {
  const version = readVersion + 1;
  readVersion = version;
  const file = $('rename-file').files?.[0] || null;
  clearInputState();

  if (!file) {
    notice('CSVファイルを選択してください。', true);
    return;
  }

  try {
    const records = parseCsv(decodeUtf8(await file.arrayBuffer()));
    const details = validateCsv(records);
    if (version !== readVersion || $('rename-file').files?.[0] !== file) return;

    sourceFile = file;
    sourceRecords = records;
    renderEditor(details.headers);
    $('rename-file-name').textContent = file.name;
    $('rename-file-size').textContent = `${file.size.toLocaleString('ja-JP')} bytes`;
    $('rename-column-count').textContent = details.columnCount.toLocaleString('ja-JP');
    $('rename-data-row-count').textContent = details.dataRows.length.toLocaleString('ja-JP');
    $('rename-summary').hidden = false;
    $('rename-editor-area').hidden = false;
    $('rename-button').disabled = false;
    notice('新しい列名を入力して、「列名を変更」を押してください。');
  } catch (error) {
    if (version !== readVersion || $('rename-file').files?.[0] !== file) return;
    notice(error instanceof CsvError ? error.message : 'CSVを読み込めませんでした。', true);
  }
}

function processRename() {
  if (!sourceRecords || !sourceFile) {
    notice('先にCSVファイルを選択してください。', true);
    return;
  }

  resetResult();
  const newHeaders = [...document.querySelectorAll('#rename-column-editor input[name="rename-header"]')]
    .map((input) => input.value);
  try {
    outputRecords = renameCsvHeaders(sourceRecords, newHeaders);
    outputName = outputFilename(sourceFile.name, 'renamed-columns');
    $('rename-result-column-count').textContent = (outputRecords[0]?.length ?? 0).toLocaleString('ja-JP');
    $('rename-result-data-row-count').textContent = (outputRecords.length - 1).toLocaleString('ja-JP');
    renderPreview(outputRecords);
    $('rename-result').hidden = false;
    $('save-renamed-csv').disabled = false;
    notice('列名を変更しました。データ内容を確認してCSVを保存してください。');
  } catch (error) {
    notice(error instanceof CsvError ? error.message : 'CSVの列名を変更できませんでした。', true);
  }
}

function saveCsv() {
  if (!outputRecords || !outputName) return;
  const blob = new Blob([createUtf8BomCsv(outputRecords)], { type: 'text/csv;charset=utf-8' });
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
  $('rename-file').addEventListener('change', () => { void readFile(); });
  $('rename-button').addEventListener('click', processRename);
  $('save-renamed-csv').addEventListener('click', saveCsv);
});

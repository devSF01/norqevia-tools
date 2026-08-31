import { columnLabel, CsvError, createUtf8BomCsv, decodeUtf8, outputFilename, parseCsv, validateCsv } from './csv-columns-core.js';
import { sortCsvRecords } from './csv-sort-core.js';

const $ = (id) => document.getElementById(id);
let sourceFile = null;
let sourceRecords = null;
let outputRecords = null;
let outputName = null;
let readVersion = 0;

function notice(message, error = false) {
  $('sort-notice').textContent = message;
  $('sort-notice').classList.toggle('error', error);
}

function resetResult() {
  outputRecords = null;
  outputName = null;
  $('sort-result').hidden = true;
  $('save-sorted-csv').disabled = true;
  $('sort-preview').replaceChildren();
  $('sort-preview-note').textContent = '';
}

function clearInputState() {
  sourceFile = null;
  sourceRecords = null;
  resetResult();
  $('sort-summary').hidden = true;
  $('sort-options').hidden = true;
  $('sort-column').replaceChildren();
}

function renderColumns(headers) {
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '列を選択してください';
  placeholder.disabled = true;
  placeholder.selected = true;

  const options = headers.map((header, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = columnLabel(headers, index);
    return option;
  });
  $('sort-column').replaceChildren(placeholder, ...options);
}

function renderPreview(records) {
  const table = document.createElement('table');
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  records[0].forEach((value) => {
    const cell = document.createElement('th');
    cell.textContent = value;
    headRow.append(cell);
  });
  head.append(headRow);
  table.append(head);

  const body = document.createElement('tbody');
  records.slice(1, 21).forEach((row) => {
    const tr = document.createElement('tr');
    row.forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      tr.append(cell);
    });
    body.append(tr);
  });
  table.append(body);
  $('sort-preview').replaceChildren(table);

  const previewCount = Math.min(records.length - 1, 20);
  $('sort-preview-note').textContent = previewCount === 0
    ? '出力するデータ行はありません。'
    : `並べ替え後の先頭${previewCount}データ行を表示しています。`;
}

function formatDirection(direction) {
  return direction === 'desc' ? '降順' : '昇順';
}

async function readFile() {
  const version = readVersion + 1;
  readVersion = version;
  const file = $('sort-file').files?.[0] || null;
  clearInputState();

  if (!file) {
    notice('CSVファイルを選択してください。', true);
    return;
  }

  try {
    const records = parseCsv(decodeUtf8(await file.arrayBuffer()));
    const details = validateCsv(records);
    if (version !== readVersion || $('sort-file').files?.[0] !== file) return;

    sourceFile = file;
    sourceRecords = records;
    renderColumns(details.headers);
    $('sort-file-name').textContent = file.name;
    $('sort-file-size').textContent = `${file.size.toLocaleString('ja-JP')} bytes`;
    $('sort-column-count').textContent = details.columnCount.toLocaleString('ja-JP');
    $('sort-data-row-count').textContent = details.dataRows.length.toLocaleString('ja-JP');
    $('sort-summary').hidden = false;
    $('sort-options').hidden = false;
    notice('並べ替える列と方向を選び、「並べ替える」を押してください。');
  } catch (error) {
    if (version !== readVersion || $('sort-file').files?.[0] !== file) return;
    notice(error instanceof CsvError ? error.message : 'CSVを読み込めませんでした。', true);
  }
}

function processSort() {
  if (!sourceRecords || !sourceFile) {
    notice('先にCSVファイルを選択してください。', true);
    return;
  }

  resetResult();
  const selectedValue = $('sort-column').value;
  if (selectedValue === '') {
    notice('並べ替える列を選択してください。', true);
    return;
  }

  const columnIndex = Number(selectedValue);
  const direction = document.querySelector('input[name="sort-direction"]:checked')?.value;
  try {
    outputRecords = sortCsvRecords(sourceRecords, columnIndex, direction);
    outputName = outputFilename(sourceFile.name, 'sorted');
    $('sort-result-column').textContent = columnLabel(sourceRecords[0], columnIndex);
    $('sort-result-direction').textContent = formatDirection(direction);
    $('sort-result-row-count').textContent = `${(outputRecords.length - 1).toLocaleString('ja-JP')}行`;
    renderPreview(outputRecords);
    $('sort-result').hidden = false;
    $('save-sorted-csv').disabled = false;
    notice(`${columnLabel(sourceRecords[0], columnIndex)}を${formatDirection(direction)}で並べ替えました。内容を確認してCSVを保存してください。`);
  } catch (error) {
    notice(error instanceof CsvError ? error.message : 'CSVを並べ替えられませんでした。', true);
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
  $('sort-file').addEventListener('change', () => { void readFile(); });
  $('sort-button').addEventListener('click', processSort);
  $('save-sorted-csv').addEventListener('click', saveCsv);
});

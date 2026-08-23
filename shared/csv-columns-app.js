import { CsvError, columnLabel, createUtf8BomCsv, decodeUtf8, extractColumns, outputFilename, parseCsv, validateCsv } from './csv-columns-core.js';

const $ = (id) => document.getElementById(id);
let sourceRecords = null;
let selectedOutput = null;
let selectedFilename = null;

function notice(message, error = false) {
  $('csv-notice').textContent = message;
  $('csv-notice').classList.toggle('error', error);
}

function selectedIndexes() {
  return [...document.querySelectorAll('input[name="csv-column"]:checked')].map((input) => Number(input.value));
}

function updateCounts() {
  const count = selectedIndexes().length;
  $('selected-column-count').textContent = count.toLocaleString('ja-JP');
  $('create-csv').disabled = sourceRecords === null;
}

function renderColumns(headers) {
  $('column-options').replaceChildren(...headers.map((header, index) => {
    const label = document.createElement('label');
    label.className = 'column-option';
    const input = document.createElement('input');
    input.type = 'checkbox'; input.name = 'csv-column'; input.value = String(index); input.checked = true;
    input.addEventListener('change', updateCounts);
    label.append(input, document.createTextNode(` ${columnLabel(headers, index)}`));
    return label;
  }));
}

function renderPreview(records) {
  const table = document.createElement('table');
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const value of records[0]) { const cell = document.createElement('th'); cell.textContent = value; headRow.append(cell); }
  head.append(headRow); table.append(head);
  const body = document.createElement('tbody');
  for (const row of records.slice(1, 21)) { const tr = document.createElement('tr'); for (const value of row) { const cell = document.createElement('td'); cell.textContent = value; tr.append(cell); } body.append(tr); }
  table.append(body);
  $('csv-preview').replaceChildren(table);
  $('preview-note').textContent = `選択列: ${records[0].join(' / ')}。先頭${Math.min(records.length - 1, 20)}行を表示しています。`;
  $('preview-area').hidden = false;
}

async function readFile() {
  const file = $('csv-file').files?.[0];
  if (!file) return;
  sourceRecords = null; selectedOutput = null; selectedFilename = null;
  $('file-summary').hidden = true; $('column-selection').hidden = true; $('preview-area').hidden = true; $('save-csv').disabled = true; $('create-csv').disabled = true;
  try {
    const records = parseCsv(decodeUtf8(await file.arrayBuffer()));
    const details = validateCsv(records);
    sourceRecords = records;
    renderColumns(details.headers);
    $('file-name').textContent = file.name;
    $('file-size').textContent = `${file.size.toLocaleString('ja-JP')} bytes`;
    $('original-column-count').textContent = details.columnCount.toLocaleString('ja-JP');
    $('data-row-count').textContent = details.dataRows.length.toLocaleString('ja-JP');
    $('file-summary').hidden = false; $('column-selection').hidden = false;
    updateCounts(); notice('列を選んで「選択した列でCSVを作成」を押してください。');
  } catch (error) {
    notice(error instanceof CsvError ? error.message : 'CSVを読み込めませんでした。', true);
  }
}

function createOutput() {
  try {
    const indexes = selectedIndexes();
    selectedOutput = extractColumns(sourceRecords, indexes);
    selectedFilename = outputFilename($('csv-file').files?.[0]?.name);
    renderPreview(selectedOutput); $('save-csv').disabled = false;
    notice('抽出結果を作成しました。内容を確認してCSVを保存してください。');
  } catch (error) { notice(error instanceof CsvError ? error.message : 'CSVを作成できませんでした。', true); }
}

function saveCsv() {
  if (!selectedOutput || !selectedFilename) return;
  const blob = new Blob([createUtf8BomCsv(selectedOutput)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = selectedFilename; link.click();
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
  $('csv-file').addEventListener('change', readFile);
  $('select-all-columns').addEventListener('click', () => { document.querySelectorAll('input[name="csv-column"]').forEach((input) => { input.checked = true; }); updateCounts(); });
  $('clear-all-columns').addEventListener('click', () => { document.querySelectorAll('input[name="csv-column"]').forEach((input) => { input.checked = false; }); updateCounts(); });
  $('create-csv').addEventListener('click', createOutput);
  $('save-csv').addEventListener('click', saveCsv);
});

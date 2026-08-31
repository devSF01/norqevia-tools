import { columnLabel, CsvError, createUtf8BomCsv, decodeUtf8, outputFilename, parseCsv, validateCsv } from './csv-columns-core.js';
import { removeDuplicateRows } from './csv-remove-duplicates-core.js';

const $ = (id) => document.getElementById(id);
let sourceRecords = null;
let outputRecords = null;
let outputName = null;

function notice(message, error = false) {
  $('dedupe-notice').textContent = message;
  $('dedupe-notice').classList.toggle('error', error);
}

function selectedIndexes() {
  return [...document.querySelectorAll('input[name="dedupe-key"]:checked')]
    .map((input) => Number(input.value));
}

function renderKeys(headers) {
  $('dedupe-key-options').replaceChildren(...headers.map((header, index) => {
    const label = document.createElement('label');
    label.className = 'column-option';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'dedupe-key';
    input.value = String(index);
    label.append(input, document.createTextNode(` ${columnLabel(headers, index)}`));
    return label;
  }));
}

function resetResult() {
  outputRecords = null;
  outputName = null;
  $('dedupe-result').hidden = true;
  $('save-deduped-csv').disabled = true;
  $('dedupe-preview').replaceChildren();
  $('dedupe-preview-note').textContent = '';
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
  $('dedupe-preview').replaceChildren(table);

  const previewCount = Math.min(records.length - 1, 20);
  $('dedupe-preview-note').textContent = previewCount === 0
    ? '出力するデータ行はありません。'
    : `重複削除後の先頭${previewCount}データ行を表示しています。`;
}

async function readFile() {
  const file = $('dedupe-file').files?.[0];
  if (!file) return;

  sourceRecords = null;
  resetResult();
  $('dedupe-summary').hidden = true;
  $('dedupe-key-selection').hidden = true;
  try {
    const records = parseCsv(decodeUtf8(await file.arrayBuffer()));
    const details = validateCsv(records);
    sourceRecords = records;
    renderKeys(details.headers);
    $('dedupe-file-name').textContent = file.name;
    $('dedupe-file-size').textContent = `${file.size.toLocaleString('ja-JP')} bytes`;
    $('dedupe-column-count').textContent = details.columnCount.toLocaleString('ja-JP');
    $('dedupe-data-row-count').textContent = details.dataRows.length.toLocaleString('ja-JP');
    $('dedupe-summary').hidden = false;
    $('dedupe-key-selection').hidden = false;
    notice('重複判定に使う列を1つ以上選び、「重複行を削除」を押してください。');
  } catch (error) {
    notice(error instanceof CsvError ? error.message : 'CSVを読み込めませんでした。', true);
  }
}

function processFile() {
  if (!sourceRecords) {
    notice('先にCSVファイルを選択してください。', true);
    return;
  }

  resetResult();
  try {
    const indexes = selectedIndexes();
    const result = removeDuplicateRows(sourceRecords, indexes);
    outputRecords = result.records;
    outputName = outputFilename($('dedupe-file').files?.[0]?.name, 'duplicates-removed');
    $('dedupe-source-row-count').textContent = result.originalDataRowCount.toLocaleString('ja-JP');
    $('dedupe-key-columns').textContent = indexes.map((index) => columnLabel(sourceRecords[0], index)).join(' / ');
    $('dedupe-group-count').textContent = result.duplicateGroupCount.toLocaleString('ja-JP');
    $('dedupe-removed-row-count').textContent = result.removedDataRowCount.toLocaleString('ja-JP');
    $('dedupe-output-row-count').textContent = result.remainingDataRowCount.toLocaleString('ja-JP');
    renderPreview(outputRecords);
    $('dedupe-result').hidden = false;
    $('save-deduped-csv').disabled = false;
    notice(result.removedDataRowCount
      ? `${result.removedDataRowCount.toLocaleString('ja-JP')}行の重複行を削除しました。内容を確認してCSVを保存してください。`
      : '重複行は見つかりませんでした。元の内容のまま保存できます。');
  } catch (error) {
    notice(error instanceof CsvError ? error.message : '重複行を削除できませんでした。', true);
  }
}

function saveCsv() {
  if (!outputRecords || !outputName) return;
  const blob = new Blob([createUtf8BomCsv(outputRecords)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = outputName;
  link.click();
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
  $('dedupe-file').addEventListener('change', readFile);
  $('remove-duplicates').addEventListener('click', processFile);
  $('save-deduped-csv').addEventListener('click', saveCsv);
});

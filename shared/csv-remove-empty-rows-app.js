import { CsvError, createUtf8BomCsv, decodeUtf8, outputFilename, parseCsv, validateCsv } from './csv-columns-core.js';
import { removeEmptyRows } from './csv-remove-empty-rows-core.js';

const $ = (id) => document.getElementById(id);
let outputRecords = null;
let outputName = null;

function notice(message, error = false) {
  $('remove-empty-notice').textContent = message;
  $('remove-empty-notice').classList.toggle('error', error);
}

function renderPreview(records) {
  const table = document.createElement('table');
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const value of records[0]) { const cell = document.createElement('th'); cell.textContent = value; headRow.append(cell); }
  head.append(headRow); table.append(head);
  const body = document.createElement('tbody');
  for (const row of records.slice(1, 21)) {
    const tr = document.createElement('tr');
    for (const value of row) { const cell = document.createElement('td'); cell.textContent = value; tr.append(cell); }
    body.append(tr);
  }
  table.append(body);
  $('remove-empty-preview').replaceChildren(table);
  $('preview-note').textContent = `空欄行を除いた先頭${Math.min(records.length - 1, 20)}行を表示しています。`;
}

async function processFile() {
  const file = $('remove-empty-file').files?.[0];
  if (!file) return;
  outputRecords = null; outputName = null;
  $('remove-empty-summary').hidden = true; $('remove-empty-preview-area').hidden = true; $('save-remove-empty').disabled = true;
  try {
    const sourceRecords = parseCsv(decodeUtf8(await file.arrayBuffer()));
    const result = removeEmptyRows(sourceRecords);
    const details = validateCsv(result.records);
    outputRecords = result.records;
    outputName = outputFilename(file.name, 'empty-rows-removed');
    $('remove-empty-file-name').textContent = file.name;
    $('remove-empty-file-size').textContent = `${file.size.toLocaleString('ja-JP')} bytes`;
    $('remove-empty-column-count').textContent = details.columnCount.toLocaleString('ja-JP');
    $('remove-empty-data-row-count').textContent = result.dataRowCount.toLocaleString('ja-JP');
    $('removed-row-count').textContent = result.removedRowCount.toLocaleString('ja-JP');
    $('remaining-row-count').textContent = result.keptRowCount.toLocaleString('ja-JP');
    renderPreview(outputRecords);
    $('remove-empty-summary').hidden = false; $('remove-empty-preview-area').hidden = false; $('save-remove-empty').disabled = false;
    notice(result.removedRowCount ? `${result.removedRowCount.toLocaleString('ja-JP')}行の完全な空欄行を削除しました。` : '削除対象の完全な空欄行はありませんでした。');
  } catch (error) {
    notice(error instanceof CsvError ? error.message : 'CSVを読み込めませんでした。', true);
  }
}

function saveCsv() {
  if (!outputRecords || !outputName) return;
  const blob = new Blob([createUtf8BomCsv(outputRecords)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = outputName; link.click();
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
  $('remove-empty-file').addEventListener('change', processFile);
  $('save-remove-empty').addEventListener('click', saveCsv);
});

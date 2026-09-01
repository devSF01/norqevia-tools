import { CsvError, columnLabel, createUtf8BomCsv, decodeUtf8, outputFilename, parseCsv, validateCsv } from './csv-columns-core.js';
import { createCsvPreviewTable } from './csv-tool-ui.js';
import { filterCsvRecords } from './csv-row-filter-core.js';

const $ = (id) => document.getElementById(id);
let sourceFile = null;
let sourceRecords = null;
let outputRecords = null;
let outputName = null;
let readVersion = 0;

function notice(message, error = false) {
  $('filter-notice').textContent = message;
  $('filter-notice').classList.toggle('error', error);
}

function resetResult() {
  outputRecords = null;
  outputName = null;
  $('filter-result').hidden = true;
  $('save-filtered-csv').disabled = true;
  $('filter-preview').replaceChildren();
  $('filter-preview-note').textContent = '';
}

function clearInputState() {
  sourceFile = null;
  sourceRecords = null;
  resetResult();
  $('filter-summary').hidden = true;
  $('filter-options').hidden = true;
  $('filter-button').disabled = true;
  $('filter-column').replaceChildren();
  $('filter-value').value = '';
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
  $('filter-column').replaceChildren(placeholder, ...options);
}

function renderPreview(records) {
  $('filter-preview').replaceChildren(createCsvPreviewTable(records));
  const previewCount = Math.min(records.length - 1, 20);
  $('filter-preview-note').textContent = previewCount === 0
    ? '抽出結果にデータ行はありません。ヘッダーだけを表示しています。'
    : `抽出後の先頭${previewCount}データ行を表示しています。`;
}

async function readFile() {
  const version = readVersion + 1;
  readVersion = version;
  const file = $('filter-file').files?.[0] || null;
  clearInputState();

  if (!file) {
    notice('CSVファイルを選択してください。', true);
    return;
  }

  try {
    const records = parseCsv(decodeUtf8(await file.arrayBuffer()));
    const details = validateCsv(records);
    if (version !== readVersion || $('filter-file').files?.[0] !== file) return;

    sourceFile = file;
    sourceRecords = records;
    renderColumns(details.headers);
    $('filter-file-name').textContent = file.name;
    $('filter-file-size').textContent = `${file.size.toLocaleString('ja-JP')} bytes`;
    $('filter-column-count').textContent = details.columnCount.toLocaleString('ja-JP');
    $('filter-data-row-count').textContent = details.dataRows.length.toLocaleString('ja-JP');
    $('filter-summary').hidden = false;
    $('filter-options').hidden = false;
    $('filter-button').disabled = false;
    notice('列・条件・比較値を指定して、「行を絞り込む」を押してください。');
  } catch (error) {
    if (version !== readVersion || $('filter-file').files?.[0] !== file) return;
    notice(error instanceof CsvError ? error.message : 'CSVを読み込めませんでした。', true);
  }
}

function processFilter() {
  if (!sourceRecords || !sourceFile) {
    notice('先にCSVファイルを選択してください。', true);
    return;
  }

  resetResult();
  const selectedValue = $('filter-column').value;
  if (selectedValue === '') {
    notice('絞り込む列を選択してください。', true);
    return;
  }

  try {
    const columnIndex = Number(selectedValue);
    const operator = $('filter-operator').value;
    const value = $('filter-value').value;
    outputRecords = filterCsvRecords(sourceRecords, columnIndex, operator, value);
    outputName = outputFilename(sourceFile.name, 'filtered');
    $('filter-source-row-count').textContent = (sourceRecords.length - 1).toLocaleString('ja-JP');
    $('filter-output-row-count').textContent = (outputRecords.length - 1).toLocaleString('ja-JP');
    renderPreview(outputRecords);
    $('filter-result').hidden = false;
    $('save-filtered-csv').disabled = false;
    const noMatchMessage = operator === 'equals'
      ? '一致するデータ行はありません。ヘッダーだけのCSVを保存できます。'
      : '条件に該当するデータ行はありません。ヘッダーだけのCSVを保存できます。';
    notice(outputRecords.length === 1
      ? noMatchMessage
      : `${(outputRecords.length - 1).toLocaleString('ja-JP')}行を抽出しました。内容を確認してCSVを保存してください。`);
  } catch (error) {
    notice(error instanceof CsvError ? error.message : 'CSVを絞り込めませんでした。', true);
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
  $('filter-file').addEventListener('change', () => { void readFile(); });
  $('filter-button').addEventListener('click', processFilter);
  $('save-filtered-csv').addEventListener('click', saveCsv);
});

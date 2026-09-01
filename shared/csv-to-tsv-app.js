import { CsvError, decodeUtf8, outputFilenameWithExtension, parseCsv, validateCsv } from './csv-columns-core.js';
import { createCsvPreviewTable } from './csv-tool-ui.js';
import { serializeTsv } from './csv-to-tsv-core.js';

const $ = (id) => document.getElementById(id);
let sourceFile = null;
let sourceRecords = null;
let outputRecords = null;
let outputText = null;
let outputName = null;
let readVersion = 0;

function notice(message, error = false) {
  $('tsv-notice').textContent = message;
  $('tsv-notice').classList.toggle('error', error);
}

function resetResult() {
  outputRecords = null;
  outputText = null;
  outputName = null;
  $('tsv-result').hidden = true;
  $('save-tsv').disabled = true;
  $('tsv-preview').replaceChildren();
  $('tsv-preview-note').textContent = '';
}

function clearInputState() {
  sourceFile = null;
  sourceRecords = null;
  resetResult();
  $('tsv-summary').hidden = true;
  $('tsv-convert-button').disabled = true;
}

function renderPreview(records) {
  $('tsv-preview').replaceChildren(createCsvPreviewTable(records));
  const previewCount = Math.min(records.length - 1, 20);
  $('tsv-preview-note').textContent = previewCount === 0
    ? 'データ行はありません。ヘッダーだけを表示しています。'
    : `TSVに変換する先頭${previewCount}データ行を表示しています。`;
}

async function readFile() {
  const version = readVersion + 1;
  readVersion = version;
  const file = $('tsv-file').files?.[0] || null;
  clearInputState();

  if (!file) {
    notice('CSVファイルを選択してください。', true);
    return;
  }

  try {
    const records = parseCsv(decodeUtf8(await file.arrayBuffer()));
    const details = validateCsv(records);
    if (version !== readVersion || $('tsv-file').files?.[0] !== file) return;

    sourceFile = file;
    sourceRecords = records;
    $('tsv-file-name').textContent = file.name;
    $('tsv-file-size').textContent = `${file.size.toLocaleString('ja-JP')} bytes`;
    $('tsv-column-count').textContent = details.columnCount.toLocaleString('ja-JP');
    $('tsv-data-row-count').textContent = details.dataRows.length.toLocaleString('ja-JP');
    $('tsv-summary').hidden = false;
    $('tsv-convert-button').disabled = false;
    notice('内容を確認し、「TSVに変換」を押してください。');
  } catch (error) {
    if (version !== readVersion || $('tsv-file').files?.[0] !== file) return;
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
    outputRecords = sourceRecords.map((row) => row.slice());
    outputText = serializeTsv(outputRecords);
    outputName = outputFilenameWithExtension(sourceFile.name, 'tsv');
    $('tsv-result-row-count').textContent = (outputRecords.length - 1).toLocaleString('ja-JP');
    renderPreview(outputRecords);
    $('tsv-result').hidden = false;
    $('save-tsv').disabled = false;
    notice('TSVに変換しました。内容を確認してファイルを保存してください。');
  } catch (error) {
    notice(error instanceof CsvError ? error.message : 'TSVに変換できませんでした。', true);
  }
}

function saveTsv() {
  if (!outputText || !outputName) return;
  const blob = new Blob([outputText], { type: 'text/tab-separated-values;charset=utf-8' });
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
  $('tsv-file').addEventListener('change', () => { void readFile(); });
  $('tsv-convert-button').addEventListener('click', processConvert);
  $('save-tsv').addEventListener('click', saveTsv);
});

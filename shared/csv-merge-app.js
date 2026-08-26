import { CsvError, createUtf8BomCsv, decodeUtf8, outputFilename, parseCsv } from './csv-columns-core.js';
import { mergeCsvRecords } from './csv-merge-core.js';

const $ = (id) => document.getElementById(id);
let outputRecords = null;
let outputName = null;

function notice(message, error = false) {
  $('merge-notice').textContent = message;
  $('merge-notice').classList.toggle('error', error);
}

function resetResult() {
  outputRecords = null;
  outputName = null;
  $('merge-summary').hidden = true;
  $('merge-preview-area').hidden = true;
  $('save-merged-csv').disabled = true;
  $('merge-preview').replaceChildren();
}

function renderPreview(records) {
  const table = document.createElement('table');
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const value of records[0]) {
    const cell = document.createElement('th');
    cell.textContent = value;
    headRow.append(cell);
  }
  head.append(headRow);
  table.append(head);

  const body = document.createElement('tbody');
  for (const row of records.slice(1, 21)) {
    const tr = document.createElement('tr');
    for (const value of row) {
      const cell = document.createElement('td');
      cell.textContent = value;
      tr.append(cell);
    }
    body.append(tr);
  }
  table.append(body);
  $('merge-preview').replaceChildren(table);
  $('preview-note').textContent = `結合後の先頭${Math.min(records.length - 1, 20)}行を表示しています。`;
}

async function readFiles() {
  const files = [...($('merge-files').files || [])];
  resetResult();
  if (files.length < 2) {
    notice('CSVファイルを2つ以上選択してください。', true);
    return;
  }

  try {
    const recordSets = [];
    for (const [index, file] of files.entries()) {
      try {
        const text = decodeUtf8(await file.arrayBuffer());
        recordSets.push(parseCsv(text));
      } catch (error) {
        if (error instanceof CsvError) {
          throw new CsvError(`${index + 1}番目のCSV（${file.name}）: ${error.message}`);
        }
        throw error;
      }
    }

    const result = mergeCsvRecords(recordSets);
    outputRecords = result.records;
    outputName = outputFilename(files[0].name, 'merged');
    $('merge-file-names').textContent = files.map((file) => file.name).join('、');
    $('merge-file-count').textContent = result.fileCount.toLocaleString('ja-JP');
    $('merge-total-size').textContent = `${files.reduce((total, file) => total + file.size, 0).toLocaleString('ja-JP')} bytes`;
    $('merge-column-count').textContent = result.columnCount.toLocaleString('ja-JP');
    $('merge-data-row-count').textContent = result.dataRowCount.toLocaleString('ja-JP');
    renderPreview(outputRecords);
    $('merge-summary').hidden = false;
    $('merge-preview-area').hidden = false;
    $('save-merged-csv').disabled = false;
    notice(`${result.fileCount.toLocaleString('ja-JP')}個のCSVを結合しました。内容を確認してCSVを保存してください。`);
  } catch (error) {
    notice(error instanceof CsvError ? error.message : 'CSVを読み込めませんでした。', true);
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
  $('merge-files').addEventListener('change', readFiles);
  $('save-merged-csv').addEventListener('click', saveCsv);
});

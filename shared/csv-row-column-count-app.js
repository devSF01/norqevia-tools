import { CsvError, decodeUtf8, parseCsv } from './csv-columns-core.js';
import { countCsvRowsAndColumns } from './csv-row-column-count-core.js';

const $ = (id) => document.getElementById(id);
let readVersion = 0;

function notice(message, error = false) {
  $('count-notice').textContent = message;
  $('count-notice').classList.toggle('error', error);
}

function resetSummary() {
  $('count-summary').hidden = true;
  $('count-headers').replaceChildren();
}

function renderHeaders(headerLabels) {
  const table = document.createElement('table');
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const value of ['列番号', '列名']) {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = value;
    headRow.append(cell);
  }
  head.append(headRow);
  table.append(head);

  const body = document.createElement('tbody');
  headerLabels.forEach((label, index) => {
    const row = document.createElement('tr');
    const numberCell = document.createElement('td');
    numberCell.textContent = `${index + 1}列目`;
    const labelCell = document.createElement('td');
    labelCell.textContent = label;
    row.append(numberCell, labelCell);
    body.append(row);
  });
  table.append(body);
  $('count-headers').replaceChildren(table);
}

async function readFile() {
  const version = readVersion + 1;
  readVersion = version;
  const file = $('count-file').files?.[0] || null;
  resetSummary();

  if (!file) {
    notice('CSVファイルを選択してください。', true);
    return;
  }

  try {
    const records = parseCsv(decodeUtf8(await file.arrayBuffer()));
    const result = countCsvRowsAndColumns(records);
    if (version !== readVersion || $('count-file').files?.[0] !== file) return;

    $('count-file-name').textContent = file.name;
    $('count-file-size').textContent = `${file.size.toLocaleString('ja-JP')} bytes`;
    $('count-column-count').textContent = result.columnCount.toLocaleString('ja-JP');
    $('count-data-row-count').textContent = result.dataRowCount.toLocaleString('ja-JP');
    $('count-record-count').textContent = result.recordCount.toLocaleString('ja-JP');
    renderHeaders(result.headerLabels);
    $('count-summary').hidden = false;
    notice('CSVの行数・列数とヘッダー一覧を確認できます。');
  } catch (error) {
    if (version !== readVersion || $('count-file').files?.[0] !== file) return;
    notice(error instanceof CsvError ? error.message : 'CSVを読み込めませんでした。', true);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  $('count-file').addEventListener('change', () => { void readFile(); });
});

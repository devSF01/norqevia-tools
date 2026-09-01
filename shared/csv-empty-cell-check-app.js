import { CsvError, decodeUtf8, parseCsv, validateCsv } from './csv-columns-core.js';
import { checkEmptyCells } from './csv-empty-cell-check-core.js';

const EMPTY_CELL_DISPLAY_LIMIT = 100;
const $ = (id) => document.getElementById(id);

let sourceFile = null;
let sourceRecords = null;
let readVersion = 0;

function notice(message, error = false) {
  $('empty-cell-notice').textContent = message;
  $('empty-cell-notice').classList.toggle('error', error);
}

function resetResult() {
  $('empty-cell-result').hidden = true;
  $('empty-cell-column-table').replaceChildren();
  $('empty-cell-position-list').replaceChildren();
  $('empty-cell-position-note').textContent = '';
  $('empty-cell-result-note').textContent = '';
}

function clearInputState() {
  sourceFile = null;
  sourceRecords = null;
  resetResult();
  $('empty-cell-summary').hidden = true;
  $('empty-cell-check-button').disabled = true;
}

function createTable(headers, rows) {
  const table = document.createElement('table');
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');

  headers.forEach((value) => {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = value;
    headRow.append(cell);
  });
  head.append(headRow);
  table.append(head);

  const body = document.createElement('tbody');
  rows.forEach((row) => {
    const tableRow = document.createElement('tr');
    row.forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      tableRow.append(cell);
    });
    body.append(tableRow);
  });
  table.append(body);
  return table;
}

function renderColumnSummary(columns) {
  const rows = columns.map((column) => [
    column.header,
    (column.columnIndex + 1) + '列目',
    column.emptyCount.toLocaleString('ja-JP')
  ]);
  $('empty-cell-column-table').replaceChildren(createTable(['列名', '列番号', '空欄件数'], rows));
}

function renderEmptyCellPositions(emptyCells) {
  if (emptyCells.length === 0) {
    $('empty-cell-result-note').textContent = '空欄セルは見つかりませんでした。';
    $('empty-cell-position-note').textContent = '空欄位置の表示はありません。';
    return;
  }

  const visibleCells = emptyCells.slice(0, EMPTY_CELL_DISPLAY_LIMIT);
  const rows = visibleCells.map((cell) => [
    cell.recordNumber + '行目',
    cell.header,
    (cell.columnIndex + 1) + '列目'
  ]);
  $('empty-cell-position-list').replaceChildren(createTable(['CSV行番号', '列名', '列番号'], rows));

  if (emptyCells.length > EMPTY_CELL_DISPLAY_LIMIT) {
    $('empty-cell-result-note').textContent = '空欄セルは' + emptyCells.length.toLocaleString('ja-JP') + '件です。先頭' + EMPTY_CELL_DISPLAY_LIMIT + '件を表示しています。';
    $('empty-cell-position-note').textContent = '空欄位置は先頭' + EMPTY_CELL_DISPLAY_LIMIT + '件に制限して表示しています。';
  } else {
    $('empty-cell-result-note').textContent = '空欄セルは' + emptyCells.length.toLocaleString('ja-JP') + '件です。すべて表示しています。';
    $('empty-cell-position-note').textContent = '空欄セルの位置を表示しています。';
  }
}

async function readFile() {
  const version = readVersion + 1;
  readVersion = version;
  const file = $('empty-cell-file').files?.[0] || null;
  clearInputState();

  if (!file) {
    notice('CSVファイルを選択してください。', true);
    return;
  }

  try {
    const records = parseCsv(decodeUtf8(await file.arrayBuffer()));
    const details = validateCsv(records);
    if (version !== readVersion || $('empty-cell-file').files?.[0] !== file) return;

    sourceFile = file;
    sourceRecords = records;
    $('empty-cell-file-name').textContent = file.name;
    $('empty-cell-file-size').textContent = file.size.toLocaleString('ja-JP') + ' bytes';
    $('empty-cell-column-count').textContent = details.columnCount.toLocaleString('ja-JP');
    $('empty-cell-data-row-count').textContent = details.dataRows.length.toLocaleString('ja-JP');
    $('empty-cell-summary').hidden = false;
    $('empty-cell-check-button').disabled = false;
    notice('内容を確認し、「空欄セルをチェック」を押してください。');
  } catch (error) {
    if (version !== readVersion || $('empty-cell-file').files?.[0] !== file) return;
    notice(error instanceof CsvError ? error.message : 'CSVを読み込めませんでした。', true);
  }
}

function processCheck() {
  if (!sourceRecords || !sourceFile) {
    notice('先にCSVファイルを選択してください。', true);
    return;
  }

  try {
    const result = checkEmptyCells(sourceRecords);
    $('empty-cell-result-empty-count').textContent = result.emptyCellCount.toLocaleString('ja-JP');
    $('empty-cell-result-row-count').textContent = result.rowsWithEmptyCount.toLocaleString('ja-JP');
    $('empty-cell-result-data-row-count').textContent = result.dataRowCount.toLocaleString('ja-JP');
    $('empty-cell-result-column-count').textContent = result.columnCount.toLocaleString('ja-JP');
    renderColumnSummary(result.columns);
    renderEmptyCellPositions(result.emptyCells);
    $('empty-cell-result').hidden = false;
    notice(result.emptyCellCount === 0
      ? '空欄セルは見つかりませんでした。'
      : result.emptyCellCount.toLocaleString('ja-JP') + '件の空欄セルを検出しました。');
  } catch (error) {
    notice(error instanceof CsvError ? error.message : '空欄セルをチェックできませんでした。', true);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  $('empty-cell-file').addEventListener('change', () => { void readFile(); });
  $('empty-cell-check-button').addEventListener('click', processCheck);
});

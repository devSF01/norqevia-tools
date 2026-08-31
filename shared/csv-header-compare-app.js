import { CsvError, decodeUtf8, parseCsv, validateCsv } from './csv-columns-core.js';
import { compareHeaders } from './csv-header-compare-core.js';

const $ = (id) => document.getElementById(id);
const sides = Object.freeze({
  a: { label: 'CSVファイルA', inputId: 'header-a-file', summaryId: 'header-a-summary' },
  b: { label: 'CSVファイルB', inputId: 'header-b-file', summaryId: 'header-b-summary' }
});
const fileStates = { a: null, b: null };
const readVersions = { a: 0, b: 0 };
const resultValueIds = [
  'result-exact-match',
  'result-column-count-a',
  'result-column-count-b',
  'result-only-a-count',
  'result-only-b-count',
  'result-common-count',
  'result-order'
];
const resultListIds = ['only-a-columns', 'common-columns', 'only-b-columns', 'header-order-differences'];

function notice(message, error = false) {
  $('header-compare-notice').textContent = message;
  $('header-compare-notice').classList.toggle('error', error);
}

function getFile(side) {
  return $(sides[side].inputId).files?.[0] || null;
}

function clearSummary(side) {
  const summary = $(sides[side].summaryId);
  summary.hidden = true;
  summary.querySelectorAll('dd').forEach((item) => { item.textContent = ''; });
}

function resetResult() {
  $('header-result').hidden = true;
  resultValueIds.forEach((id) => { $(id).textContent = ''; });
  resultListIds.forEach((id) => { $(id).replaceChildren(); });
}

function formatCount(value) {
  return Number(value).toLocaleString('ja-JP');
}

function formatHeaderName(value) {
  if (value === '') return '（空ヘッダー）';
  return String(value);
}

function formatColumnEntry(column, showCount = false) {
  const name = formatHeaderName(column?.name ?? '');
  const count = Number(column?.count);
  return count > 1 || showCount ? name + '（' + formatCount(count) + '列）' : name;
}

function formatPositionValue(value) {
  if (value === null) return '（なし）';
  return formatHeaderName(value);
}

function sumCounts(columns) {
  return columns.reduce((total, column) => total + (Number(column?.count) || 0), 0);
}

function renderSummary(side, details) {
  const prefix = 'header-' + side;
  $(prefix + '-file-name').textContent = details.file.name;
  $(prefix + '-file-size').textContent = formatCount(details.file.size) + ' bytes';
  $(prefix + '-column-count').textContent = formatCount(details.columnCount);
  $(prefix + '-data-row-count').textContent = formatCount(details.dataRowCount);
  $(sides[side].summaryId).hidden = false;
}

function renderColumnList(id, columns, showCount = false) {
  const container = $(id);
  container.replaceChildren();
  if (!columns.length) {
    container.textContent = 'なし';
    return;
  }

  const list = document.createElement('ul');
  list.className = 'column-list';
  columns.forEach((column) => {
    const item = document.createElement('li');
    item.textContent = formatColumnEntry(column, showCount);
    list.append(item);
  });
  container.append(list);
}

function renderOrderDifferences(positions) {
  const container = $('header-order-differences');
  container.replaceChildren();
  const differences = positions.filter((position) => !position.same);
  if (!differences.length) {
    container.textContent = 'なし';
    return;
  }

  const list = document.createElement('ul');
  list.className = 'order-list';
  differences.forEach((position, fallbackIndex) => {
    const item = document.createElement('li');
    const index = Number.isInteger(position.index) ? position.index : fallbackIndex + 1;
    item.textContent = index + '列目: A「' + formatPositionValue(position.a) + '」 / B「' + formatPositionValue(position.b) + '」';
    list.append(item);
  });
  container.append(list);
}

function renderResult(result) {
  const onlyA = Array.isArray(result.onlyA) ? result.onlyA : [];
  const onlyB = Array.isArray(result.onlyB) ? result.onlyB : [];
  const common = Array.isArray(result.common) ? result.common : [];
  const positions = Array.isArray(result.positions) ? result.positions : [];

  $('result-exact-match').textContent = result.matchesExactly ? 'はい' : 'いいえ';
  $('result-column-count-a').textContent = formatCount(result.columnCountA);
  $('result-column-count-b').textContent = formatCount(result.columnCountB);
  $('result-only-a-count').textContent = formatCount(sumCounts(onlyA));
  $('result-only-b-count').textContent = formatCount(sumCounts(onlyB));
  $('result-common-count').textContent = formatCount(sumCounts(common));
  $('result-order').textContent = result.sameOrder ? '同じ' : '異なる';

  renderColumnList('only-a-columns', onlyA, true);
  renderColumnList('common-columns', common);
  renderColumnList('only-b-columns', onlyB, true);
  renderOrderDifferences(positions);
  $('header-result').hidden = false;
}

async function parseFile(file) {
  const records = parseCsv(decodeUtf8(await file.arrayBuffer()));
  const details = validateCsv(records);
  return {
    file,
    headers: details.headers.slice(),
    columnCount: details.columnCount,
    dataRowCount: details.dataRows.length
  };
}

function readErrorMessage(error) {
  return error instanceof CsvError ? error.message : 'CSVを読み込めませんでした。';
}

async function readSide(side) {
  const version = readVersions[side] + 1;
  readVersions[side] = version;
  const file = getFile(side);
  fileStates[side] = null;
  clearSummary(side);
  resetResult();

  if (!file) {
    notice(sides[side].label + 'を選択してください。', true);
    return null;
  }

  try {
    const details = await parseFile(file);
    if (version !== readVersions[side] || getFile(side) !== file) return null;
    fileStates[side] = details;
    renderSummary(side, details);
    notice(sides[side].label + 'を読み込みました。2つのCSVを選択して「ヘッダーを比較」を押してください。');
    return details;
  } catch (error) {
    if (version !== readVersions[side] || getFile(side) !== file) return null;
    notice(sides[side].label + '（' + file.name + '）: ' + readErrorMessage(error), true);
    return null;
  }
}

async function ensureSideReady(side) {
  const file = getFile(side);
  if (!file) {
    notice(sides[side].label + 'を選択してください。', true);
    return null;
  }
  if (fileStates[side]?.file === file) return fileStates[side];
  return readSide(side);
}

async function compare() {
  resetResult();
  if (!getFile('a')) {
    notice('CSVファイルAを選択してください。', true);
    return;
  }
  if (!getFile('b')) {
    notice('CSVファイルBを選択してください。', true);
    return;
  }

  const detailsA = await ensureSideReady('a');
  if (!detailsA) return;
  const detailsB = await ensureSideReady('b');
  if (!detailsB) return;

  try {
    const result = compareHeaders(detailsA.headers, detailsB.headers);
    renderResult(result);
    if (result.matchesExactly) {
      notice('ヘッダーは完全一致しました。データ行は比較していません。');
    } else if (result.sameColumnMultiset) {
      notice('列名は同じですが、列順が異なります。データ行は比較していません。');
    } else {
      notice('ヘッダーの差異を表示しています。データ行は比較していません。');
    }
  } catch (error) {
    notice(error instanceof CsvError ? error.message : 'ヘッダーを比較できませんでした。', true);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  $('header-a-file').addEventListener('change', () => { void readSide('a'); });
  $('header-b-file').addEventListener('change', () => { void readSide('b'); });
  $('header-compare-button').addEventListener('click', () => { void compare(); });
});

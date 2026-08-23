import { columnLabel, createUtf8BomCsv, decodeUtf8, outputFilename, parseCsv, serializeCsv, validateCsv } from './csv-columns-core.js';
import { findDuplicateGroups } from './csv-duplicate-core.js';

const $ = (id) => document.getElementById(id);
const MAX_GROUPS = 20;
const MAX_ROWS = 20;
let sourceRecords = null;
let latestResult = null;
let latestFilename = null;

function notice(message, error = false) { $('duplicate-notice').textContent = message; $('duplicate-notice').classList.toggle('error', error); }
function selectedIndexes() { return [...document.querySelectorAll('input[name="duplicate-key"]:checked')].map((input) => Number(input.value)); }
function renderKeys(headers) { $('duplicate-key-options').replaceChildren(...headers.map((header, index) => { const label = document.createElement('label'); label.className = 'column-option'; const input = document.createElement('input'); input.type = 'checkbox'; input.name = 'duplicate-key'; input.value = String(index); label.append(input, document.createTextNode(` ${columnLabel(headers, index)}`)); return label; })); }
function cell(value, type = 'td') { const item = document.createElement(type); item.textContent = value; return item; }
function renderGroups(headers, indexes, result) {
  const container = $('duplicate-groups'); container.replaceChildren();
  if (result.groups.length === 0) { container.textContent = '重複は見つかりませんでした。'; return; }
  for (const group of result.groups.slice(0, MAX_GROUPS)) {
    const section = document.createElement('section'); section.className = 'duplicate-group';
    const title = document.createElement('h4'); title.textContent = `キー: ${indexes.map((index, position) => `${columnLabel(headers, index)} = ${group.keyValues[position] === '' ? '（空欄）' : group.keyValues[position]}`).join(' / ')}（${group.rows.length}件）`; section.append(title);
    const table = document.createElement('table'); const head = document.createElement('thead'); const headRow = document.createElement('tr'); headRow.append(cell('CSVレコード番号', 'th'), cell('出現', 'th')); headers.forEach((header) => headRow.append(cell(header, 'th'))); head.append(headRow); table.append(head);
    const body = document.createElement('tbody'); group.rows.slice(0, MAX_ROWS).forEach((row) => { const tr = document.createElement('tr'); tr.append(cell(String(row.recordNumber)), cell(row.isFirst ? '最初の出現' : '2件目以降')); row.values.forEach((value) => tr.append(cell(value))); body.append(tr); }); table.append(body); section.append(table);
    if (group.rows.length > MAX_ROWS) { const note = document.createElement('p'); note.className = 'hint'; note.textContent = `このグループは先頭${MAX_ROWS}件を表示しています。`; section.append(note); }
    container.append(section);
  }
  if (result.groups.length > MAX_GROUPS) { const note = document.createElement('p'); note.className = 'hint'; note.textContent = `重複グループは先頭${MAX_GROUPS}件を表示しています。すべての重複行はCSV保存できます。`; container.append(note); }
}
async function readFile() {
  const file = $('duplicate-file').files?.[0]; if (!file) return;
  sourceRecords = null; latestResult = null; latestFilename = null; $('duplicate-summary').hidden = true; $('duplicate-key-selection').hidden = true; $('duplicate-result').hidden = true; $('save-duplicates').disabled = true;
  try { const records = parseCsv(decodeUtf8(await file.arrayBuffer())); const details = validateCsv(records); sourceRecords = records; renderKeys(details.headers); $('duplicate-file-name').textContent = file.name; $('duplicate-file-size').textContent = `${file.size.toLocaleString('ja-JP')} bytes`; $('duplicate-column-count').textContent = details.columnCount.toLocaleString('ja-JP'); $('duplicate-data-row-count').textContent = details.dataRows.length.toLocaleString('ja-JP'); $('duplicate-summary').hidden = false; $('duplicate-key-selection').hidden = false; notice('重複判定に使う列を1つ以上選び、「重複をチェック」を押してください。'); }
  catch (error) { notice(error.message || 'CSVを読み込めませんでした。', true); }
}
function checkDuplicates() {
  try { const indexes = selectedIndexes(); latestResult = findDuplicateGroups(sourceRecords, indexes); latestFilename = outputFilename($('duplicate-file').files?.[0]?.name, 'duplicates'); const headers = sourceRecords[0]; $('result-data-rows').textContent = latestResult.dataRowCount.toLocaleString('ja-JP'); $('result-keys').textContent = indexes.map((index) => columnLabel(headers, index)).join(' / '); $('result-unique-keys').textContent = latestResult.uniqueKeyCount.toLocaleString('ja-JP'); $('result-group-count').textContent = latestResult.duplicateGroupCount.toLocaleString('ja-JP'); $('result-row-count').textContent = latestResult.duplicateRowCount.toLocaleString('ja-JP'); renderGroups(headers, indexes, latestResult); $('duplicate-result').hidden = false; $('save-duplicates').disabled = latestResult.duplicateRowCount === 0; notice(latestResult.duplicateRowCount ? '重複を検出しました。内容を確認してCSVを保存できます。' : '重複は見つかりませんでした。'); }
  catch (error) { notice(error.message || '重複を確認できませんでした。', true); }
}
function saveDuplicates() { if (!latestResult?.duplicateRowCount) return; const blob = new Blob([createUtf8BomCsv(latestResult.duplicateRecords)], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = latestFilename; link.click(); URL.revokeObjectURL(url); }
document.addEventListener('DOMContentLoaded', () => { $('duplicate-file').addEventListener('change', readFile); $('check-duplicates').addEventListener('click', checkDuplicates); $('save-duplicates').addEventListener('click', saveDuplicates); });

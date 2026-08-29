import { CsvError, createUtf8BomCsv, decodeUtf8, outputFilename, parseCsv } from './csv-columns-core.js';
import { splitCsvRecords } from './csv-split-core.js';

const $ = (id) => document.getElementById(id);
let outputParts = [];

function notice(message, error = false) {
  $('split-notice').textContent = message;
  $('split-notice').classList.toggle('error', error);
}

function resetResult() {
  outputParts = [];
  $('split-summary').hidden = true;
  $('split-preview-area').hidden = true;
  $('save-split-csv').disabled = true;
  $('split-preview').replaceChildren();
  $('split-preview-note').textContent = '';
  notice('');
}

function renderTable(records, container) {
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
  container.replaceChildren(table);
}

function renderPreview(parts) {
  const fragment = document.createDocumentFragment();
  for (const [index, part] of parts.entries()) {
    const section = document.createElement('section');
    section.className = 'split-part';
    section.setAttribute('aria-label', `${part.filename}のプレビュー`);

    const heading = document.createElement('div');
    heading.className = 'section-heading';
    const title = document.createElement('h4');
    title.textContent = `${index + 1} / ${parts.length}: ${part.filename}`;
    heading.append(title);

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.textContent = 'このCSVを保存';
    saveButton.setAttribute('aria-label', `${part.filename}を保存`);
    saveButton.addEventListener('click', () => savePart(part));
    heading.append(saveButton);
    section.append(heading);

    const rowNote = document.createElement('p');
    rowNote.className = 'hint';
    rowNote.textContent = `${part.dataRowCount.toLocaleString('ja-JP')}データ行`;
    section.append(rowNote);

    const preview = document.createElement('div');
    preview.className = 'csv-preview';
    preview.tabIndex = 0;
    renderTable(part.records, preview);
    section.append(preview);

    if (part.dataRowCount > 20) {
      const note = document.createElement('p');
      note.className = 'hint';
      note.textContent = '先頭20データ行を表示しています。';
      section.append(note);
    }
    fragment.append(section);
  }
  $('split-preview').replaceChildren(fragment);
  $('split-preview-note').textContent = '各分割ファイルの先頭20データ行までを表示しています。保存する前に内容を確認してください。';
}

function savePart(part) {
  const blob = new Blob([createUtf8BomCsv(part.records)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = part.filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function saveAllParts() {
  for (const part of outputParts) savePart(part);
}

async function processFile() {
  const file = $('split-file').files?.[0];
  resetResult();
  if (!file) {
    notice('CSVファイルを選択してください。', true);
    return;
  }

  try {
    const sourceRecords = parseCsv(decodeUtf8(await file.arrayBuffer()));
    const result = splitCsvRecords(sourceRecords, Number($('rows-per-file').value));
    outputParts = result.parts.map((records, index) => ({
      records,
      filename: outputFilename(file.name, `part-${index + 1}`),
      dataRowCount: records.length - 1
    }));

    $('split-file-name').textContent = file.name;
    $('split-file-size').textContent = `${file.size.toLocaleString('ja-JP')} bytes`;
    $('split-column-count').textContent = result.headers.length.toLocaleString('ja-JP');
    $('split-data-row-count').textContent = result.dataRowCount.toLocaleString('ja-JP');
    $('split-rows-per-file').textContent = result.rowsPerFile.toLocaleString('ja-JP');
    $('split-part-count').textContent = result.partCount.toLocaleString('ja-JP');
    renderPreview(outputParts);
    $('split-summary').hidden = false;
    $('split-preview-area').hidden = false;
    $('save-split-csv').disabled = false;
    notice(`${result.partCount.toLocaleString('ja-JP')}個のCSVに分割しました。内容を確認して保存してください。`);
  } catch (error) {
    notice(error instanceof CsvError ? error.message : 'CSVを読み込めませんでした。', true);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  $('split-file').addEventListener('change', resetResult);
  $('rows-per-file').addEventListener('input', resetResult);
  $('split-button').addEventListener('click', processFile);
  $('save-split-csv').addEventListener('click', saveAllParts);
});

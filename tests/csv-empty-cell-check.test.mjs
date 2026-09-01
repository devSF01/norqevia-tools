import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import { parseCsv, validateCsv } from '../shared/csv-columns-core.js';
import { checkEmptyCells, findEmptyCells } from '../shared/csv-empty-cell-check-core.js';

function parseValid(text) {
  const records = parseCsv(text);
  validateCsv(records);
  return records;
}

test('空欄がないCSVを集計できる', () => {
  const result = checkEmptyCells(parseValid('ID,NAME\n001,田中\n002,鈴木'));

  assert.equal(result.dataRowCount, 2);
  assert.equal(result.columnCount, 2);
  assert.equal(result.emptyCellCount, 0);
  assert.equal(result.rowsWithEmptyCount, 0);
  assert.deepEqual(result.columns, [
    { columnIndex: 0, header: 'ID', emptyCount: 0 },
    { columnIndex: 1, header: 'NAME', emptyCount: 0 }
  ]);
  assert.deepEqual(result.emptyCells, []);
});

test('1セルの空欄を検出する', () => {
  const result = checkEmptyCells(parseValid('ID,NAME\n001,田中\n002,'));

  assert.equal(result.emptyCellCount, 1);
  assert.equal(result.rowsWithEmptyCount, 1);
  assert.deepEqual(result.emptyCells, [{
    recordNumber: 3,
    dataRowNumber: 2,
    columnIndex: 1,
    header: 'NAME'
  }]);
});

test('1行に複数の空欄があればセルごとに返す', () => {
  const result = checkEmptyCells(parseValid('ID,NAME,EMAIL\n001,,\n002,鈴木,mail@example.com'));

  assert.equal(result.emptyCellCount, 2);
  assert.equal(result.rowsWithEmptyCount, 1);
  assert.deepEqual(result.emptyCells.map((cell) => [cell.recordNumber, cell.columnIndex]), [[2, 1], [2, 2]]);
});

test('複数行の空欄を行ごとに数える', () => {
  const result = checkEmptyCells([
    ['ID', 'NAME'],
    ['001', ''],
    ['', '鈴木'],
    ['003', '田中']
  ]);

  assert.equal(result.emptyCellCount, 2);
  assert.equal(result.rowsWithEmptyCount, 2);
  assert.deepEqual(result.emptyCells.map((cell) => cell.recordNumber), [2, 3]);
});

test('同じ列の空欄件数を集計する', () => {
  const result = checkEmptyCells([
    ['ID', 'NAME', 'EMAIL'],
    ['001', '', 'a@example.com'],
    ['002', '', 'b@example.com'],
    ['003', '田中', '']
  ]);

  assert.deepEqual(result.columns.map((column) => column.emptyCount), [0, 2, 1]);
});

test('複数列の空欄件数を別々に集計する', () => {
  const result = checkEmptyCells([
    ['A', 'B', 'C'],
    ['', 'x', ''],
    ['y', '', 'z']
  ]);

  assert.deepEqual(result.columns.map((column) => column.emptyCount), [1, 1, 1]);
  assert.equal(result.emptyCellCount, 3);
});

test('厳密な空文字列だけを空欄として扱う', () => {
  const result = checkEmptyCells([
    ['EMPTY', 'HALF', 'FULL', 'TAB', 'ZERO', 'NULL', 'NULL_LOWER', 'NA', 'DASH'],
    ['', ' ', '　', '\t', '0', 'NULL', 'null', 'N/A', '-']
  ]);

  assert.equal(result.emptyCellCount, 1);
  assert.deepEqual(result.emptyCells.map((cell) => cell.columnIndex), [0]);
});

test('半角スペースは空欄ではない', () => {
  const result = checkEmptyCells([['VALUE'], [' ']]);

  assert.equal(result.emptyCellCount, 0);
  assert.equal(result.columns[0].emptyCount, 0);
});

test('全角スペースは空欄ではない', () => {
  const result = checkEmptyCells([['VALUE'], ['　']]);

  assert.equal(result.emptyCellCount, 0);
});

test('0、NULL、N/A、ハイフンは空欄ではない', () => {
  const result = checkEmptyCells([['A', 'B', 'C', 'D'], ['0', 'NULL', 'N/A', '-']]);

  assert.equal(result.emptyCellCount, 0);
});

test('日本語ヘッダーとUnicode値を変更せず扱う', () => {
  const result = checkEmptyCells([
    ['顧客番号', '氏名', 'メモ'],
    ['001', '😀', 'é'],
    ['002', '', 'e\u0301']
  ]);

  assert.equal(result.emptyCellCount, 1);
  assert.equal(result.emptyCells[0].header, '氏名');
});

test('quoted empty fieldだけを空欄として検出する', () => {
  const result = checkEmptyCells(parseValid('ID,NAME,NOTE\n1,"","a,b"\n2,"通常","引用符 ""付き"""'));

  assert.equal(result.emptyCellCount, 1);
  assert.deepEqual(result.emptyCells[0], {
    recordNumber: 2,
    dataRowNumber: 1,
    columnIndex: 1,
    header: 'NAME'
  });
});

test('quoted comma、escaped quote、multiline fieldを含む周辺データを壊さない', () => {
  const result = checkEmptyCells(parseValid('ID,NOTE,EMPTY\n1,"東京,営業",""\n2,"引用符 ""付き""","複数\n行"'));

  assert.equal(result.emptyCellCount, 1);
  assert.equal(result.emptyCells[0].recordNumber, 2);
  assert.equal(result.emptyCells[0].header, 'EMPTY');
});

test('重複ヘッダーをcolumnLabel相当の列番号付き表記で区別する', () => {
  const result = checkEmptyCells([
    ['ID', 'NAME', 'NAME'],
    ['001', '', '']
  ]);

  assert.deepEqual(result.columns.map((column) => column.header), ['ID', 'NAME（2列目）', 'NAME（3列目）']);
  assert.deepEqual(result.emptyCells.map((cell) => [cell.columnIndex, cell.header]), [
    [1, 'NAME（2列目）'],
    [2, 'NAME（3列目）']
  ]);
});

test('CSV行番号とデータ行番号はヘッダーを1行目として数える', () => {
  const result = checkEmptyCells([
    ['ID', 'NAME'],
    ['001', ''],
    ['002', '']
  ]);

  assert.deepEqual(result.emptyCells.map((cell) => [cell.recordNumber, cell.dataRowNumber]), [[2, 1], [3, 2]]);
});

test('列indexは0始まりで保持する', () => {
  const result = checkEmptyCells([['A', 'B', 'C'], ['x', '', '']]);

  assert.deepEqual(result.emptyCells.map((cell) => cell.columnIndex), [1, 2]);
  assert.deepEqual(result.columns.map((column) => column.columnIndex), [0, 1, 2]);
});

test('ヘッダーだけのCSVは空欄0件として集計する', () => {
  const result = checkEmptyCells([['ID', 'NAME']]);

  assert.equal(result.dataRowCount, 0);
  assert.equal(result.emptyCellCount, 0);
  assert.equal(result.rowsWithEmptyCount, 0);
  assert.deepEqual(result.columns.map((column) => column.emptyCount), [0, 0]);
});

test('ヘッダーがないCSVは共通validatorのエラーを返す', () => {
  assert.throws(() => checkEmptyCells(parseCsv('')), /CSVにヘッダー行がありません/);
});

test('列数不整合は共通validatorのエラーを返す', () => {
  assert.throws(() => checkEmptyCells([['ID', 'NAME'], ['001']]), /CSVの列数が一致していない/);
});

test('入力recordsをmutationしない', () => {
  const records = [
    ['ID', 'NAME'],
    ['001', ''],
    ['002', '田中']
  ];
  const original = structuredClone(records);

  checkEmptyCells(records);

  assert.deepEqual(records, original);
});

test('findEmptyCells aliasは同じ検査結果を返す', () => {
  const records = [['ID'], ['']];

  assert.deepEqual(findEmptyCells(records), checkEmptyCells(records));
});

test('50,000行×4列を実用的な時間で検査する', () => {
  const records = [
    ['ID', 'NAME', 'STATUS', 'NOTE'],
    ...Array.from({ length: 50000 }, (_, index) => [
      String(index),
      index % 2 === 0 ? '' : '名前',
      '0',
      'NULL'
    ])
  ];
  const started = performance.now();
  const result = checkEmptyCells(records);

  assert.equal(result.dataRowCount, 50000);
  assert.equal(result.emptyCellCount, 25000);
  assert.equal(result.rowsWithEmptyCount, 25000);
  assert.ok(performance.now() - started < 3000);
});

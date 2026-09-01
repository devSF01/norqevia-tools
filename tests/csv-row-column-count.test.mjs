import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import { parseCsv, validateCsv } from '../shared/csv-columns-core.js';
import { countCsvRowsAndColumns } from '../shared/csv-row-column-count-core.js';

function parseValid(text) {
  const records = parseCsv(text);
  validateCsv(records);
  return records;
}

test('ヘッダーだけのCSVはrecord数1、データ行数0として数える', () => {
  assert.deepEqual(countCsvRowsAndColumns(parseValid('ID,NAME')), {
    headers: ['ID', 'NAME'],
    headerLabels: ['ID', 'NAME'],
    columnCount: 2,
    dataRowCount: 0,
    recordCount: 1
  });
});

test('1行と複数行のデータをヘッダー込みrecord数と分けて数える', () => {
  assert.equal(countCsvRowsAndColumns(parseValid('ID\n001')).dataRowCount, 1);
  assert.equal(countCsvRowsAndColumns(parseValid('ID\n001\n002\n003')).dataRowCount, 3);
  assert.equal(countCsvRowsAndColumns(parseValid('ID\n001\n002\n003')).recordCount, 4);
});

test('quoted multiline field内の改行をrecord数へ加算しない', () => {
  const result = countCsvRowsAndColumns(parseValid('ID,NOTE\n001,"一行目\n二行目"\n002,"東京,営業"\n003,"引用符 ""付き"""'));
  assert.equal(result.columnCount, 2);
  assert.equal(result.dataRowCount, 3);
  assert.equal(result.recordCount, 4);
});

test('日本語、Unicode、重複ヘッダーを保持し列番号付きlabelで区別する', () => {
  const records = parseValid('ID,名前,名前,😀\n001,田中,鈴木,é');
  const result = countCsvRowsAndColumns(records);
  assert.deepEqual(result.headers, ['ID', '名前', '名前', '😀']);
  assert.deepEqual(result.headerLabels, ['ID', '名前（2列目）', '名前（3列目）', '😀']);
});

test('入力recordsと入力行をmutationしない', () => {
  const records = parseValid('A,B\n1,2');
  const copy = records.map((row) => row.slice());
  const result = countCsvRowsAndColumns(records);
  assert.deepEqual(records, copy);
  assert.notStrictEqual(result.headers, records[0]);
});

test('ヘッダーなしと配列でない入力を安全にrejectする', () => {
  assert.throws(() => countCsvRowsAndColumns([]), /ヘッダー行がありません/);
  assert.throws(() => countCsvRowsAndColumns(null), /ヘッダー行がありません/);
});

test('50,000行程度をrecord単位で実用的に数える', () => {
  const records = [['ID', 'VALUE'], ...Array.from({ length: 50000 }, (_, index) => [String(index), `値${index}`])];
  const started = performance.now();
  const result = countCsvRowsAndColumns(records);
  assert.equal(result.dataRowCount, 50000);
  assert.equal(result.recordCount, 50001);
  assert.ok(performance.now() - started < 3000);
});

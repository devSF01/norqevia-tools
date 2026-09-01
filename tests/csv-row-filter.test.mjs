import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import { CsvError, parseCsv, validateCsv } from '../shared/csv-columns-core.js';
import { filterCsvRecords } from '../shared/csv-row-filter-core.js';

function parseValid(text) {
  const records = parseCsv(text);
  validateCsv(records);
  return records;
}

test('equalsは指定列の値を完全一致で残す', () => {
  const records = parseValid('ID,部署\n001,営業\n002,開発\n003,営業');
  assert.deepEqual(filterCsvRecords(records, 1, 'equals', '営業'), [
    ['ID', '部署'],
    ['001', '営業'],
    ['003', '営業']
  ]);
});

test('not-equalsは指定列の値が一致しない行を残す', () => {
  const records = parseValid('ID,部署\n001,営業\n002,開発\n003,営業');
  assert.deepEqual(filterCsvRecords(records, 1, 'not-equals', '営業').slice(1), [['002', '開発']]);
});

test('0件一致と全件一致を正常な結果として返す', () => {
  const records = [['ID'], ['001'], ['002']];
  assert.deepEqual(filterCsvRecords(records, 0, 'equals', '999'), [['ID']]);
  assert.deepEqual(filterCsvRecords(records, 0, 'not-equals', '999'), records);
});

test('空文字列、空白、大小文字、先頭ゼロを暗黙変換せず比較する', () => {
  const records = [['VALUE'], [''], [' '], ['x'], ['X'], ['001'], ['1']];
  assert.deepEqual(filterCsvRecords(records, 0, 'equals', ''), [['VALUE'], ['']]);
  assert.deepEqual(filterCsvRecords(records, 0, 'equals', ' '), [['VALUE'], [' ']]);
  assert.deepEqual(filterCsvRecords(records, 0, 'equals', 'x'), [['VALUE'], ['x']]);
  assert.deepEqual(filterCsvRecords(records, 0, 'equals', '001'), [['VALUE'], ['001']]);
  assert.deepEqual(filterCsvRecords(records, 0, 'equals', '1'), [['VALUE'], ['1']]);
});

test('quoted comma、escaped quote、multilineの値を保持して行順を維持する', () => {
  const records = parseValid('KEY,NOTE\nb,"東京,営業"\na,"引用符 ""付き"""\nc,"一行目\n二行目"');
  const output = filterCsvRecords(records, 0, 'not-equals', 'z');
  assert.deepEqual(output, records);
  assert.deepEqual(output.slice(1).map((row) => row[0]), ['b', 'a', 'c']);
  assert.equal(output[1][1], '東京,営業');
  assert.equal(output[2][1], '引用符 "付き"');
  assert.equal(output[3][1], '一行目\n二行目');
});

test('重複ヘッダーは列indexで選択できる', () => {
  const records = [['ID', 'NAME', 'NAME'], ['1', 'x', 'target'], ['2', 'target', 'x']];
  assert.deepEqual(filterCsvRecords(records, 2, 'equals', 'target'), [['ID', 'NAME', 'NAME'], ['1', 'x', 'target']]);
});

test('行順と入力recordsをmutationしない', () => {
  const records = [['KEY', 'VALUE'], ['b', '二'], ['a', '一'], ['b', '三']];
  const copy = records.map((row) => row.slice());
  const output = filterCsvRecords(records, 0, 'equals', 'b');
  assert.deepEqual(records, copy);
  assert.notStrictEqual(output, records);
  assert.notStrictEqual(output[0], records[0]);
  assert.notStrictEqual(output[1], records[1]);
  assert.deepEqual(output.slice(1), [['b', '二'], ['b', '三']]);
});

test('不正なcolumnIndex、operator、比較値をrejectする', () => {
  const records = [['A', 'B'], ['1', '2']];
  for (const columnIndex of [-1, 2, 1.5, Number.NaN, '0']) {
    assert.throws(() => filterCsvRecords(records, columnIndex, 'equals', '2'), CsvError);
  }
  assert.throws(() => filterCsvRecords(records, 0, 'contains', '1'), /絞り込み条件が不正/);
  assert.throws(() => filterCsvRecords(records, 0, 'equals', 1), /比較値が不正/);
});

test('50,000行程度をフィルターする', () => {
  const records = [['ID', 'GROUP'], ...Array.from({ length: 50000 }, (_, index) => [String(index), index % 2 ? 'odd' : 'even'])];
  const started = performance.now();
  const output = filterCsvRecords(records, 1, 'equals', 'even');
  assert.equal(output.length, 25001);
  assert.ok(performance.now() - started < 3000);
});

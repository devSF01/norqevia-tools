import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCsv, serializeCsv, validateCsv } from '../shared/csv-columns-core.js';
import { removeDuplicateRows } from '../shared/csv-remove-duplicates-core.js';

const csv = (text) => {
  const records = parseCsv(text);
  validateCsv(records);
  return records;
};

test('1列キーでは最初の出現だけを残し、後続の重複行を削除する', () => {
  const records = csv('ID,NAME\nA,最初\nB,残す\nA,2件目\nA,3件目');
  const original = structuredClone(records);
  const result = removeDuplicateRows(records, [0]);

  assert.deepEqual(result.headers, ['ID', 'NAME']);
  assert.equal(result.originalDataRowCount, 4);
  assert.equal(result.duplicateGroupCount, 1);
  assert.equal(result.duplicateRowCount, 3);
  assert.equal(result.removedDataRowCount, 2);
  assert.equal(result.remainingDataRowCount, 2);
  assert.deepEqual(result.dataRows, [['A', '最初'], ['B', '残す']]);
  assert.deepEqual(result.records, [['ID', 'NAME'], ['A', '最初'], ['B', '残す']]);
  assert.deepEqual(records, original);
});

test('複数列キー、複数グループ、元の行順を保持する', () => {
  const records = csv('A,B,VALUE\nx,1,最初\nx,2,残す\nx,1,削除\ny,1,最初\nx,1,さらに削除\ny,1,削除');
  const result = removeDuplicateRows(records, [0, 1]);

  assert.equal(result.duplicateGroupCount, 2);
  assert.equal(result.removedDataRowCount, 3);
  assert.deepEqual(result.records, [
    ['A', 'B', 'VALUE'],
    ['x', '1', '最初'],
    ['x', '2', '残す'],
    ['y', '1', '最初']
  ]);
});

test('空欄、空白、大文字小文字、先頭ゼロ、Unicodeを暗黙変換せず完全一致で扱う', () => {
  const records = csv('ID,VALUE\n,空欄1\n,空欄2\n ,空白1\n ,空白2\nABC,大文字\nabc,小文字\n001,ゼロ1\n001,ゼロ2\n1,数値表現\n😀,絵文字1\n😀,絵文字2');
  const result = removeDuplicateRows(records, [0]);

  assert.equal(result.removedDataRowCount, 4);
  assert.deepEqual(result.records.slice(1), [
    ['', '空欄1'],
    [' ', '空白1'],
    ['ABC', '大文字'],
    ['abc', '小文字'],
    ['001', 'ゼロ1'],
    ['1', '数値表現'],
    ['😀', '絵文字1']
  ]);
});

test('quoted comma、引用符、改行を含む値を保持してserializeできる', () => {
  const records = csv('ID,NOTE\n001,"a,b ""引用"""\n001,"重複"\n"x\ny",z\n"x\ny",q');
  const result = removeDuplicateRows(records, [0]);

  assert.deepEqual(result.records, [['ID', 'NOTE'], ['001', 'a,b "引用"'], ['x\ny', 'z']]);
  assert.equal(serializeCsv(result.records), 'ID,NOTE\r\n001,"a,b ""引用"""\r\n"x\ny",z');
});

test('重複ヘッダーは列indexで区別する', () => {
  const records = csv('ID,ID\nA,1\nA,2\nB,1\nA,1');
  const result = removeDuplicateRows(records, [1]);

  assert.equal(result.removedDataRowCount, 2);
  assert.deepEqual(result.records, [['ID', 'ID'], ['A', '1'], ['A', '2']]);
});

test('重複がない場合もヘッダーと全データ行を新しい結果として返す', () => {
  const records = [['ID', 'NAME'], ['A', '一'], ['B', '二']];
  const result = removeDuplicateRows(records, [0]);

  assert.equal(result.removedDataRowCount, 0);
  assert.equal(result.remainingDataRowCount, 2);
  assert.deepEqual(result.records, records);
  assert.notEqual(result.records, records);
  assert.notEqual(result.records[0], records[0]);
});

test('ヘッダーだけのCSVはそのまま保存対象になる', () => {
  const result = removeDuplicateRows([['ID', 'NAME']], [0]);

  assert.deepEqual(result.records, [['ID', 'NAME']]);
  assert.equal(result.originalDataRowCount, 0);
  assert.equal(result.removedDataRowCount, 0);
  assert.equal(result.remainingDataRowCount, 0);
});

test('キー列0件では停止し、入力レコードを変更しない', () => {
  const records = csv('ID,NAME\nA,一\nA,二');
  const original = structuredClone(records);

  assert.throws(() => removeDuplicateRows(records, []), /重複判定/);
  assert.deepEqual(records, original);
});

test('50,000行程度を実用的な時間で重複除去する', () => {
  const records = [['ID', 'VALUE'], ...Array.from({ length: 50000 }, (_, index) => [`K${index % 1000}`, String(index)])];
  const started = performance.now();
  const result = removeDuplicateRows(records, [0]);

  assert.equal(result.duplicateGroupCount, 1000);
  assert.equal(result.removedDataRowCount, 49000);
  assert.equal(result.remainingDataRowCount, 1000);
  assert.ok(performance.now() - started < 3000);
});

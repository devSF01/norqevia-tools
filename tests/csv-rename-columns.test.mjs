import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import { CsvError, parseCsv, validateCsv } from '../shared/csv-columns-core.js';
import { renameCsvHeaders } from '../shared/csv-rename-columns-core.js';

function parseValid(text) {
  const records = parseCsv(text);
  validateCsv(records);
  return records;
}

test('1列と複数列のヘッダーだけを変更する', () => {
  assert.deepEqual(renameCsvHeaders([['ID'], ['001']], ['顧客ID']), [['顧客ID'], ['001']]);
  assert.deepEqual(renameCsvHeaders([['ID', 'NAME', '部署'], ['001', '田中', '営業']], ['顧客ID', '氏名', '担当部署']), [
    ['顧客ID', '氏名', '担当部署'],
    ['001', '田中', '営業']
  ]);
});

test('変更なし、空ヘッダー、重複ヘッダーを許可する', () => {
  const records = [['ID', 'NAME'], ['001', '田中']];
  assert.deepEqual(renameCsvHeaders(records, ['ID', 'NAME']), records);
  assert.deepEqual(renameCsvHeaders(records, ['', '']), [['', ''], ['001', '田中']]);
});

test('空白、大小文字、Unicodeを入力文字列のまま採用する', () => {
  const output = renameCsvHeaders([['A', 'B', 'C'], ['1', '2', '3']], [' new ', 'NAME', '😀é']);
  assert.deepEqual(output[0], [' new ', 'NAME', '😀é']);
  assert.deepEqual(output[1], ['1', '2', '3']);
});

test('quoted comma、escaped quote、multilineを含むデータ行を完全保持する', () => {
  const records = parseValid('ID,NOTE\n001,"東京,営業"\n002,"引用符 ""付き"""\n003,"一行目\n二行目"');
  const output = renameCsvHeaders(records, ['顧客ID', '備考']);
  assert.deepEqual(output.slice(1), records.slice(1));
  assert.equal(output[3][1], '一行目\n二行目');
});

test('ヘッダー数不一致と不正な配列要素をrejectする', () => {
  const records = [['A', 'B'], ['1', '2']];
  assert.throws(() => renameCsvHeaders(records, ['A']), /新しい列名の数/);
  assert.throws(() => renameCsvHeaders(records, ['A', 'B', 'C']), /新しい列名の数/);
  assert.throws(() => renameCsvHeaders(records, null), /新しい列名の数/);
  assert.throws(() => renameCsvHeaders(records, ['A', 2]), CsvError);
});

test('入力recordsと入力行をmutationしない', () => {
  const records = [['A', 'B'], ['1', '2']];
  const copy = records.map((row) => row.slice());
  const output = renameCsvHeaders(records, ['X', 'Y']);
  assert.deepEqual(records, copy);
  assert.notStrictEqual(output, records);
  output[1][0] = 'changed';
  assert.equal(records[1][0], '1');
});

test('50,000行程度のデータ内容を保持してヘッダーを変更する', () => {
  const records = [['ID', 'VALUE'], ...Array.from({ length: 50000 }, (_, index) => [String(index), `値${index}`])];
  const started = performance.now();
  const output = renameCsvHeaders(records, ['識別子', '内容']);
  assert.deepEqual(output[0], ['識別子', '内容']);
  assert.deepEqual(output[50000], records[50000]);
  assert.equal(output.length, 50001);
  assert.ok(performance.now() - started < 3000);
});

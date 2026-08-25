import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCsv, validateCsv } from '../shared/csv-columns-core.js';
import { removeEmptyRows } from '../shared/csv-remove-empty-rows-core.js';

test('全列が空のデータ行だけを削除する', () => {
  const records = parseCsv('ID,NAME,NOTE\r\n1,A,\r\n,,\r\n2,,x\r\n\r\n,,');
  const original = structuredClone(records);
  const result = removeEmptyRows(records);

  assert.equal(result.removedRowCount, 3);
  assert.equal(result.keptRowCount, 2);
  assert.deepEqual(result.records, [['ID', 'NAME', 'NOTE'], ['1', 'A', ''], ['2', '', 'x']]);
  assert.deepEqual(validateCsv(result.records).dataRows, [['1', 'A', ''], ['2', '', 'x']]);
  assert.deepEqual(records, original);
});

test('空欄行がない場合はすべてのデータ行を残す', () => {
  const records = parseCsv('ID,NAME\n1,A\n2,');
  const result = removeEmptyRows(records);

  assert.equal(result.removedRowCount, 0);
  assert.deepEqual(result.records, records);
});

test('空白文字だけのセルは値として残す', () => {
  const records = parseCsv('ID,NOTE\n, \n,,');
  const result = removeEmptyRows(records);

  assert.equal(result.removedRowCount, 1);
  assert.deepEqual(result.records, [['ID', 'NOTE'], ['', ' ']]);
});

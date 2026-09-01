import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import { CsvError, parseCsv, validateCsv } from '../shared/csv-columns-core.js';
import { csvRecordsToJson, csvRecordsToObjects, serializeJsonObjects } from '../shared/csv-to-json-core.js';

function parseValid(text) {
  const records = parseCsv(text);
  validateCsv(records);
  return records;
}

test('ヘッダーをkey、各データ行をJSON objectへ変換する', () => {
  const records = [['ID', 'NAME'], ['001', '田中'], ['002', '鈴木']];
  assert.deepEqual(csvRecordsToObjects(records), [
    { ID: '001', NAME: '田中' },
    { ID: '002', NAME: '鈴木' }
  ]);
});

test('001、true、null風の値、空欄をすべて文字列として保持する', () => {
  const data = csvRecordsToObjects([['ID', 'BOOLEAN', 'NULLISH', 'EMPTY'], ['001', 'true', 'null', '']]);
  assert.equal(data[0].ID, '001');
  assert.equal(data[0].BOOLEAN, 'true');
  assert.equal(data[0].NULLISH, 'null');
  assert.equal(data[0].EMPTY, '');
  for (const value of Object.values(data[0])) assert.equal(typeof value, 'string');
});

test('日本語、Unicode、quoted comma、quote、multilineを保持する', () => {
  const records = parseValid('ID,NAME,NOTE\n001,田中,"東京,営業"\n002,😀,"引用符 ""付き"""\n003,é,"一行目\n二行目"');
  const data = csvRecordsToObjects(records);
  assert.equal(data[0].NOTE, '東京,営業');
  assert.equal(data[1].NOTE, '引用符 "付き"');
  assert.equal(data[2].NOTE, '一行目\n二行目');
  assert.equal(data[1].NAME, '😀');
});

test('key順はCSV列順、object順はCSV行順を維持する', () => {
  const records = [['2', '1', 'NAME'], ['two', 'one', '先'], ['2-b', '1-b', '後']];
  const json = csvRecordsToJson(records);
  assert.ok(json.indexOf('"2": "two"') < json.indexOf('"1": "one"'));
  assert.ok(json.indexOf('"NAME": "先"') < json.indexOf('"NAME": "後"'));
  assert.deepEqual(JSON.parse(json), [
    { '1': 'one', '2': 'two', NAME: '先' },
    { '1': '1-b', '2': '2-b', NAME: '後' }
  ]);
});

test('空ヘッダー1つは許可し、重複ヘッダーと重複空ヘッダーはrejectする', () => {
  assert.deepEqual(csvRecordsToObjects([['', 'NAME'], ['値', '田中']]), [{ '': '値', NAME: '田中' }]);
  assert.throws(() => csvRecordsToObjects([['NAME', 'NAME'], ['a', 'b']]), /重複したヘッダー/);
  assert.throws(() => csvRecordsToObjects([['', ''], ['a', 'b']]), /重複したヘッダー/);
});

test('JSON.stringifyの整形結果と末尾改行を固定する', () => {
  const records = [['ID', 'VALUE'], ['001', 'x']];
  assert.equal(csvRecordsToJson(records), '[\n  {\n    "ID": "001",\n    "VALUE": "x"\n  }\n]\n');
  assert.equal(serializeJsonObjects([], ['ID']), '[]\n');
});

test('入力recordsと入力行をmutationしない', () => {
  const records = [['A', 'B'], ['1', '2']];
  const copy = records.map((row) => row.slice());
  const data = csvRecordsToObjects(records);
  assert.deepEqual(records, copy);
  data[0].A = 'changed';
  assert.equal(records[1][0], '1');
});

test('配列でないrecord値は暗黙変換せずrejectする', () => {
  assert.throws(() => csvRecordsToObjects([['A'], [1]]), CsvError);
});

test('50,000行程度をJSONへ変換する', () => {
  const records = [['ID', 'VALUE'], ...Array.from({ length: 50000 }, (_, index) => [String(index), `値${index}`])];
  const started = performance.now();
  const output = csvRecordsToJson(records);
  assert.ok(output.startsWith('[\n  {\n    "ID": "0"'));
  assert.ok(output.includes('"ID": "49999"'));
  assert.ok(output.endsWith('\n'));
  assert.ok(performance.now() - started < 5000);
});

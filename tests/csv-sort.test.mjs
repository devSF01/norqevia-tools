import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import { CsvError, createUtf8BomCsv, outputFilename, parseCsv, serializeCsv, validateCsv } from '../shared/csv-columns-core.js';
import { sortCsvRecords } from '../shared/csv-sort-core.js';

function parseValid(text) {
  const records = parseCsv(text);
  validateCsv(records);
  return records;
}

test('1列を文字列として昇順に並べ替える', () => {
  const records = parseValid('ID,NAME\n003,鈴木\n001,佐藤\n002,田中');
  assert.deepEqual(sortCsvRecords(records, 0, 'asc'), [
    ['ID', 'NAME'],
    ['001', '佐藤'],
    ['002', '田中'],
    ['003', '鈴木']
  ]);
});

test('1列を文字列として降順に並べ替える', () => {
  const records = parseValid('ID,NAME\n003,鈴木\n001,佐藤\n002,田中');
  assert.deepEqual(sortCsvRecords(records, 0, 'desc'), [
    ['ID', 'NAME'],
    ['003', '鈴木'],
    ['002', '田中'],
    ['001', '佐藤']
  ]);
});

test('ヘッダーを常に先頭に保持し、データ行だけを並べ替える', () => {
  const records = parseValid('KEY,VALUE\nb,二\na,一');
  const output = sortCsvRecords(records, 0, 'asc');
  assert.deepEqual(output[0], ['KEY', 'VALUE']);
  assert.deepEqual(output.slice(1), [['a', '一'], ['b', '二']]);
});

test('キーに対応する行全体を一緒に移動する', () => {
  const records = parseValid('KEY,ID,NOTE\nb,002,二\na,001,一');
  assert.deepEqual(sortCsvRecords(records, 0, 'asc').slice(1), [
    ['a', '001', '一'],
    ['b', '002', '二']
  ]);
});

test('001と1を数値化せず文字列順で比較する', () => {
  const records = [['ID', 'VALUE'], ['1', 'one'], ['001', 'zero-padded']];
  assert.deepEqual(sortCsvRecords(records, 0, 'asc').slice(1), [
    ['001', 'zero-padded'],
    ['1', 'one']
  ]);
});

test('大文字小文字を区別して比較する', () => {
  const records = [['VALUE'], ['a'], ['A']];
  assert.deepEqual(sortCsvRecords(records, 0, 'asc').slice(1), [['A'], ['a']]);
});

test('前後の空白をtrimせず比較する', () => {
  const records = [['VALUE'], ['x'], [' x'], ['x ']];
  assert.deepEqual(sortCsvRecords(records, 0, 'asc').slice(1), [[' x'], ['x'], ['x ']]);
});

test('空文字列を通常の文字列として比較する', () => {
  const records = [['VALUE'], ['A'], [''], [' ']];
  assert.deepEqual(sortCsvRecords(records, 0, 'asc').slice(1), [[''], [' '], ['A']]);
});

test('日本語をJavaScript文字列の大小比較で並べ替える', () => {
  const records = [['氏名'], ['鈴木'], ['田中'], ['佐藤']];
  assert.deepEqual(sortCsvRecords(records, 0, 'asc').slice(1), [['佐藤'], ['田中'], ['鈴木']]);
});

test('Unicode値を保持し、UTF-16 code unit順で比較する', () => {
  const records = [['VALUE'], ['😃'], ['é'], ['😀'], ['e']];
  assert.deepEqual(sortCsvRecords(records, 0, 'asc').slice(1), [['e'], ['é'], ['😀'], ['😃']]);
});

test('quoted commaを含む行を壊さずに並べ替える', () => {
  const records = parseValid('KEY,NOTE\nb,"東京,営業"\na,開発');
  assert.deepEqual(sortCsvRecords(records, 0, 'asc').slice(1), [
    ['a', '開発'],
    ['b', '東京,営業']
  ]);
});

test('escaped quoteを含む行を壊さずに並べ替える', () => {
  const records = parseValid('KEY,NOTE\nb,"引用符 ""付き"""\na,通常');
  assert.deepEqual(sortCsvRecords(records, 0, 'asc').slice(1), [
    ['a', '通常'],
    ['b', '引用符 "付き"']
  ]);
});

test('multiline fieldを含む行を壊さずに並べ替える', () => {
  const records = parseValid('KEY,NOTE\nb,"二行目\n続き"\na,一行');
  assert.deepEqual(sortCsvRecords(records, 0, 'asc').slice(1), [
    ['a', '一行'],
    ['b', '二行目\n続き']
  ]);
});

test('重複ヘッダーは列indexで選択できる', () => {
  const records = [['ID', 'NAME', 'NAME'], ['first', 'z', 'b'], ['second', 'a', 'a']];
  assert.deepEqual(sortCsvRecords(records, 2, 'asc').slice(1), [
    ['second', 'a', 'a'],
    ['first', 'z', 'b']
  ]);
});

test('同一キー値の行は元の相対順序を維持するstable sortを行う', () => {
  const records = [
    ['KEY', 'ROW'],
    ['b', 'b-1'],
    ['a', 'a-1'],
    ['b', 'b-2'],
    ['a', 'a-2']
  ];
  assert.deepEqual(sortCsvRecords(records, 0, 'asc').slice(1), [
    ['a', 'a-1'],
    ['a', 'a-2'],
    ['b', 'b-1'],
    ['b', 'b-2']
  ]);
  assert.deepEqual(sortCsvRecords(records, 0, 'desc').slice(1), [
    ['b', 'b-1'],
    ['b', 'b-2'],
    ['a', 'a-1'],
    ['a', 'a-2']
  ]);
});

test('入力recordsと各入力行をmutationしない', () => {
  const records = parseValid('KEY,VALUE\nb,二\na,一');
  const copy = records.map((row) => row.slice());
  const output = sortCsvRecords(records, 0, 'asc');
  assert.deepEqual(records, copy);
  assert.notStrictEqual(output, records);
  assert.notStrictEqual(output[0], records[0]);
  assert.notStrictEqual(output[1], records[1]);
  assert.notStrictEqual(output[2], records[2]);
});

test('不正なcolumnIndexをrejectする', () => {
  const records = [['A', 'B'], ['1', '2']];
  for (const columnIndex of [-1, 2, 1.5, Number.NaN, '0']) {
    assert.throws(() => sortCsvRecords(records, columnIndex, 'asc'), CsvError);
  }
});

test('不正なdirectionをrejectする', () => {
  const records = [['A'], ['1']];
  for (const direction of ['ascending', 'DESC', '', null, undefined]) {
    assert.throws(() => sortCsvRecords(records, 0, direction), CsvError);
  }
});

test('serializerで並べ替え後の値、BOM、CRLFを保持する', () => {
  const records = parseValid('KEY,NOTE\nb,"x,y"\na,"q""z"');
  const output = sortCsvRecords(records, 0, 'asc');
  assert.equal(serializeCsv(output), 'KEY,NOTE\r\na,"q""z"\r\nb,"x,y"');
  assert.equal(createUtf8BomCsv(output), '\uFEFFKEY,NOTE\r\na,"q""z"\r\nb,"x,y"');
  assert.equal(outputFilename('customers.csv', 'sorted'), 'customers-sorted.csv');
});

test('50,000行を実用的な時間でstable sortする', () => {
  const records = [
    ['KEY', 'VALUE'],
    ...Array.from({ length: 50000 }, (_, index) => {
      const key = String(50000 - index).padStart(5, '0');
      return [key, `row-${index}`];
    })
  ];
  const started = performance.now();
  const output = sortCsvRecords(records, 0, 'asc');
  const elapsed = performance.now() - started;
  assert.equal(output[1][0], '00001');
  assert.equal(output[1][1], 'row-49999');
  assert.equal(output.at(-1)[0], '50000');
  assert.ok(elapsed < 3000, `50,000行の並べ替えに${elapsed.toFixed(0)}msかかりました`);
});

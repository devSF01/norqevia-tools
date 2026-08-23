import test from 'node:test';
import assert from 'node:assert/strict';
import { CsvError, columnLabel, createUtf8BomCsv, decodeUtf8, extractColumns, outputFilename, parseCsv, serializeCsv, validateCsv } from '../shared/csv-columns-core.js';

const parseValid = (text) => { const records = parseCsv(text); validateCsv(records); return records; };

test('基本的な列抽出、1列、全列と列順を維持する', () => {
  const records = parseValid('ID,NAME,部署\r\n001,田中,営業\r\n002,鈴木,開発');
  assert.deepEqual(extractColumns(records, [0, 2]), [['ID', '部署'], ['001', '営業'], ['002', '開発']]);
  assert.deepEqual(extractColumns(records, [1]), [['NAME'], ['田中'], ['鈴木']]);
  assert.deepEqual(extractColumns(records, [0, 1, 2]), records);
});

test('選択列が0件なら安全に停止する', () => assert.throws(() => extractColumns([['A'], ['1']], []), /残す列を1つ以上/));
test('日本語、Unicode、先頭ゼロ、空フィールド、行末空フィールドを文字列のまま保つ', () => {
  const records = parseValid('ID,氏名,記号,空\n001,田中,😀,\n000123,鈴木,é,');
  assert.deepEqual(records[1], ['001', '田中', '😀', '']);
  assert.equal(records[2][0], '000123');
});
test('quoted comma、quote、multilineを解析する', () => {
  assert.deepEqual(parseValid('A,B,C\n"a,b","a""b","1\n2"'), [['A','B','C'], ['a,b','a"b','1\n2']]);
});
test('CRLFとLFを解析する', () => {
  assert.deepEqual(parseValid('A,B\r\n1,2\r\n3,4'), parseValid('A,B\n1,2\n3,4'));
});
test('UTF-8 BOM入力を読み込む', () => assert.equal(decodeUtf8(new TextEncoder().encode('\uFEFFA,B\n1,2').buffer), 'A,B\n1,2'));
test('非UTF-8バイトはエラーにする', () => assert.throws(() => decodeUtf8(new Uint8Array([0x82, 0xa0]).buffer), CsvError));
test('重複ヘッダーはindexで区別する', () => {
  const headers = ['ID', 'NAME', 'NAME'];
  assert.equal(columnLabel(headers, 1), 'NAME（2列目）');
  assert.equal(columnLabel(headers, 2), 'NAME（3列目）');
  assert.deepEqual(extractColumns(parseValid('ID,NAME,NAME\n1,A,B'), [2, 1]), [['NAME','NAME'], ['B','A']]);
});
test('構造異常はrecord単位で安全に停止する', () => assert.throws(() => validateCsv(parseCsv('A,B\n1\n2,3')), /2行目: ヘッダーは2列ですが、この行は1列/));
test('serializerはcomma、quote、改行をescapeしCRLFで出力する', () => {
  assert.equal(serializeCsv([['A','B'], ['a,b','a"b'], ['x\ny','']]), 'A,B\r\n"a,b","a""b"\r\n"x\ny",');
});
test('UTF-8 BOM出力、新しいファイル名、元データ非変更', () => {
  const input = [['ID','NAME'], ['001','田中']];
  const copy = structuredClone(input);
  assert.equal(createUtf8BomCsv(input).charCodeAt(0), 0xfeff);
  assert.equal(outputFilename('customers.csv'), 'customers-columns.csv');
  assert.equal(outputFilename('CUSTOMERS.CSV'), 'CUSTOMERS-columns.csv');
  extractColumns(input, [0]);
  assert.deepEqual(input, copy);
});
test('50,000行・20列を実用的な時間で処理する', () => {
  const header = Array.from({ length: 20 }, (_, index) => `C${index}`);
  const records = [header, ...Array.from({ length: 50000 }, (_, row) => header.map((_, column) => `${row}-${column}`))];
  const started = performance.now();
  const output = createUtf8BomCsv(extractColumns(records, [0, 5, 19]));
  assert.ok(output.startsWith('\uFEFFC0,C5,C19\r\n'));
  assert.ok(performance.now() - started < 3000);
});

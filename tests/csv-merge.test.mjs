import test from 'node:test';
import assert from 'node:assert/strict';
import { createUtf8BomCsv, decodeUtf8, parseCsv, serializeCsv, validateCsv } from '../shared/csv-columns-core.js';
import { mergeCsvRecords } from '../shared/csv-merge-core.js';

const csv = (text) => parseCsv(text);

test('2つ以上のCSVを選択順に結合し、ヘッダーを1行だけ残す', () => {
  const first = csv('ID,NAME\r\n001,田中\r\n002,鈴木');
  const second = csv('ID,NAME\n003,佐藤');
  const result = mergeCsvRecords([first, second]);

  assert.deepEqual(result.records, [
    ['ID', 'NAME'],
    ['001', '田中'],
    ['002', '鈴木'],
    ['003', '佐藤']
  ]);
  assert.equal(result.fileCount, 2);
  assert.equal(result.columnCount, 2);
  assert.equal(result.dataRowCount, 3);
});

test('3つ以上のCSVもすべてのデータ行を入力順に結合する', () => {
  const result = mergeCsvRecords([
    csv('A,B\n1,first'),
    csv('A,B\n2,second'),
    csv('A,B\n3,third')
  ]);

  assert.deepEqual(result.dataRows.map((row) => row[0]), ['1', '2', '3']);
  assert.equal(result.fileCount, 3);
});

test('ファイル数が2未満なら安全に停止する', () => {
  assert.throws(() => mergeCsvRecords([]), /2つ以上/);
  assert.throws(() => mergeCsvRecords([csv('A\n1')]), /2つ以上/);
});

test('ヘッダーの値、列順、列数が完全一致しない場合は停止する', () => {
  const source = csv('ID,NAME\n1,A');
  const original = structuredClone(source);
  assert.throws(() => mergeCsvRecords([source, csv('ID,NAME\n2,B'), csv('NAME,ID\nC,3')]), /ヘッダー/);
  assert.throws(() => mergeCsvRecords([source, csv('ID,NAME\n2,B'), csv('ID,NAME,NOTE\n3,C,x')]), /ヘッダー/);
  assert.throws(() => mergeCsvRecords([source, csv('ID,NAME\n2,B'), csv('ID,FULLNAME\n3,C')]), /ヘッダー/);
  assert.deepEqual(source, original);
});

test('不正なCSVレコードが1つでもあれば結合しない', () => {
  assert.throws(() => mergeCsvRecords([csv('A,B\n1,2'), csv('A,B\n"未完了,3')]), /引用符/);
  assert.throws(() => mergeCsvRecords([csv('A,B\n1,2'), [['A', 'B'], ['3']]]), /列数/);
});

test('引用符、カンマ、改行、空欄、先頭ゼロを文字列のまま保つ', () => {
  const result = mergeCsvRecords([
    csv('ID,NOTE\n001,"a,b"'),
    csv('ID,NOTE\n0002,"複数\n行"'),
    csv('ID,NOTE\n003,')
  ]);
  assert.deepEqual(result.dataRows, [['001', 'a,b'], ['0002', '複数\n行'], ['003', '']]);
  assert.equal(serializeCsv(result.records), 'ID,NOTE\r\n001,"a,b"\r\n0002,"複数\n行"\r\n003,');
});

test('ヘッダーのみのCSVも入力でき、全入力がUTF-8 BOMで保存できる', () => {
  const bomCsv = decodeUtf8(new TextEncoder().encode('\uFEFFA,B\n1,😀').buffer);
  const result = mergeCsvRecords([csv(bomCsv), csv('A,B')]);
  const output = createUtf8BomCsv(result.records);
  assert.equal(output.charCodeAt(0), 0xfeff);
  assert.deepEqual(parseCsv(decodeUtf8(new TextEncoder().encode(output).buffer)), result.records);
  assert.deepEqual(validateCsv(result.records).dataRows, [['1', '😀']]);
});

test('入力レコードを変更しない', () => {
  const first = csv('A,B\n1,2');
  const second = csv('A,B\n3,4');
  const original = structuredClone([first, second]);
  const result = mergeCsvRecords([first, second]);
  result.records[0][0] = 'changed';
  result.records[1][0] = 'changed';
  assert.deepEqual([first, second], original);
});

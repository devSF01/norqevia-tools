import assert from 'node:assert/strict';
import test from 'node:test';
import { CsvError, parseCsv, validateCsv } from '../shared/csv-columns-core.js';
import { splitCsvRecords } from '../shared/csv-split-core.js';

const csv = (text) => parseCsv(text);

test('データ行を入力順のまま指定件数ごとに複数パートへ分割する', () => {
  const records = csv('ID,NAME\n001,田中\n002,鈴木\n003,佐藤\n004,高橋\n005,伊藤');
  const result = splitCsvRecords(records, 2);

  assert.deepEqual(result.parts, [
    [['ID', 'NAME'], ['001', '田中'], ['002', '鈴木']],
    [['ID', 'NAME'], ['003', '佐藤'], ['004', '高橋']],
    [['ID', 'NAME'], ['005', '伊藤']]
  ]);
  assert.deepEqual(result.parts.flatMap((part) => part.slice(1)), records.slice(1));
  assert.deepEqual(result.headers, ['ID', 'NAME']);
  assert.equal(result.dataRowCount, 5);
  assert.equal(result.rowsPerFile, 2);
  assert.equal(result.partCount, 3);
  result.parts.forEach((part) => assert.deepEqual(validateCsv(part).headers, result.headers));
});

test('重複したヘッダー名を変更せず、各パートに同じヘッダー行を含める', () => {
  const result = splitCsvRecords(csv('ID,ID,NOTE\n001,A,one\n002,B,two\n003,C,three'), 1);

  assert.deepEqual(result.parts.map((part) => part[0]), [
    ['ID', 'ID', 'NOTE'],
    ['ID', 'ID', 'NOTE'],
    ['ID', 'ID', 'NOTE']
  ]);
  assert.deepEqual(result.parts.flatMap((part) => part.slice(1)), [
    ['001', 'A', 'one'],
    ['002', 'B', 'two'],
    ['003', 'C', 'three']
  ]);
});

test('ヘッダーのみのCSVはヘッダーだけの1パートを返す', () => {
  const result = splitCsvRecords(csv('A,B'), 10);

  assert.deepEqual(result.parts, [[['A', 'B']]]);
  assert.deepEqual(result.headers, ['A', 'B']);
  assert.equal(result.dataRowCount, 0);
  assert.equal(result.partCount, 1);
});

test('1ファイルあたりのデータ行数は1以上の安全な整数だけを受け付ける', () => {
  const records = csv('A\n1');
  const invalidValues = [0, -1, 1.5, NaN, Infinity, '2', Number.MAX_SAFE_INTEGER + 1];

  invalidValues.forEach((rowsPerFile) => {
    assert.throws(
      () => splitCsvRecords(records, rowsPerFile),
      (error) => error instanceof CsvError
        && /1以上の安全な整数/.test(error.message)
    );
  });
});

test('列数が一致しないCSVはCsvErrorで停止する', () => {
  const records = [['A', 'B'], ['1'], ['2', 'ok']];
  const original = structuredClone(records);

  assert.throws(
    () => splitCsvRecords(records, 2),
    (error) => error instanceof CsvError && /CSVの列数が一致していない行があります/.test(error.message)
  );
  assert.deepEqual(records, original);
});

test('入力レコードを変更せず、結果を変更しても入力へ影響しない', () => {
  const records = csv('A,B\n001,one\n002,two\n003,three');
  const original = structuredClone(records);
  const result = splitCsvRecords(records, 2);

  result.parts[0][0][0] = '変更';
  result.parts[0][1][0] = '変更';
  result.headers[0] = '変更';

  assert.deepEqual(records, original);
});

test('引用符由来のカンマ・改行、先頭ゼロ、空白を文字列のまま保持する', () => {
  const result = splitCsvRecords(csv(
    'ID,NOTE\n001,"カンマ,を含む"\n002,"複数\n行"\n003,"  前後の空白  "'
  ), 2);

  assert.deepEqual(result.parts, [
    [
      ['ID', 'NOTE'],
      ['001', 'カンマ,を含む'],
      ['002', '複数\n行']
    ],
    [
      ['ID', 'NOTE'],
      ['003', '  前後の空白  ']
    ]
  ]);
});

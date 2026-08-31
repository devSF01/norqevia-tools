import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../shared/csv-columns-core.js';
import { compareHeaders } from '../shared/csv-header-compare-core.js';

test('完全一致のヘッダーを比較できる', () => {
  assert.deepStrictEqual(
    compareHeaders(['ID', 'NAME', 'DEPARTMENT'], ['ID', 'NAME', 'DEPARTMENT']),
    {
      matchesExactly: true,
      sameColumnMultiset: true,
      sameOrder: true,
      columnCountA: 3,
      columnCountB: 3,
      onlyA: [],
      onlyB: [],
      common: [
        { name: 'ID', count: 1 },
        { name: 'NAME', count: 1 },
        { name: 'DEPARTMENT', count: 1 }
      ],
      positions: [
        { index: 1, a: 'ID', b: 'ID', same: true },
        { index: 2, a: 'NAME', b: 'NAME', same: true },
        { index: 3, a: 'DEPARTMENT', b: 'DEPARTMENT', same: true }
      ]
    }
  );
});

test('データ行の内容が違ってもヘッダーだけ比較して完全一致とする', () => {
  const recordsA = parseCsv('ID,NAME\r\n001,Alice\r\n');
  const recordsB = parseCsv('ID,NAME\r\n999,Bob\r\n');

  assert.notDeepStrictEqual(recordsA.slice(1), recordsB.slice(1));
  const result = compareHeaders(recordsA[0], recordsB[0]);

  assert.equal(result.matchesExactly, true);
  assert.equal(result.sameColumnMultiset, true);
  assert.equal(result.sameOrder, true);
  assert.deepStrictEqual(result.onlyA, []);
  assert.deepStrictEqual(result.onlyB, []);
});

test('列数が違う場合は不足側をnullで表現する', () => {
  const result = compareHeaders(['ID', 'NAME', 'EMAIL'], ['ID', 'NAME']);

  assert.equal(result.matchesExactly, false);
  assert.equal(result.sameColumnMultiset, false);
  assert.equal(result.sameOrder, false);
  assert.equal(result.columnCountA, 3);
  assert.equal(result.columnCountB, 2);
  assert.deepStrictEqual(result.onlyA, [{ name: 'EMAIL', count: 1 }]);
  assert.deepStrictEqual(result.onlyB, []);
  assert.deepStrictEqual(result.common, [
    { name: 'ID', count: 1 },
    { name: 'NAME', count: 1 }
  ]);
  assert.deepStrictEqual(result.positions, [
    { index: 1, a: 'ID', b: 'ID', same: true },
    { index: 2, a: 'NAME', b: 'NAME', same: true },
    { index: 3, a: 'EMAIL', b: null, same: false }
  ]);
});

test('Aにだけある列を初出順と個数付きで返す', () => {
  const result = compareHeaders(
    ['shared', 'only-a', 'first-a-only'],
    ['shared', 'other']
  );

  assert.deepStrictEqual(result.onlyA, [
    { name: 'only-a', count: 1 },
    { name: 'first-a-only', count: 1 }
  ]);
  assert.deepStrictEqual(result.common, [{ name: 'shared', count: 1 }]);
});

test('Bにだけある列をB側の初出順と個数付きで返す', () => {
  const result = compareHeaders(
    ['shared'],
    ['only-b', 'shared', 'only-b', 'first-b-only']
  );

  assert.deepStrictEqual(result.onlyB, [
    { name: 'only-b', count: 2 },
    { name: 'first-b-only', count: 1 }
  ]);
  assert.deepStrictEqual(result.common, [{ name: 'shared', count: 1 }]);
});

test('A/B双方に固有列がある場合は共通列と分けて返す', () => {
  const result = compareHeaders(['A_ONLY', 'SHARED'], ['SHARED', 'B_ONLY']);

  assert.deepStrictEqual(result.onlyA, [{ name: 'A_ONLY', count: 1 }]);
  assert.deepStrictEqual(result.onlyB, [{ name: 'B_ONLY', count: 1 }]);
  assert.deepStrictEqual(result.common, [{ name: 'SHARED', count: 1 }]);
});

test('列数が同じでも列順が違えば完全一致ではない', () => {
  const result = compareHeaders(
    ['ID', 'NAME', 'DEPARTMENT'],
    ['NAME', 'ID', 'DEPARTMENT']
  );

  assert.equal(result.matchesExactly, false);
  assert.equal(result.sameColumnMultiset, true);
  assert.equal(result.sameOrder, false);
  assert.deepStrictEqual(result.onlyA, []);
  assert.deepStrictEqual(result.onlyB, []);
  assert.deepStrictEqual(result.common, [
    { name: 'ID', count: 1 },
    { name: 'NAME', count: 1 },
    { name: 'DEPARTMENT', count: 1 }
  ]);
  assert.deepStrictEqual(result.positions, [
    { index: 1, a: 'ID', b: 'NAME', same: false },
    { index: 2, a: 'NAME', b: 'ID', same: false },
    { index: 3, a: 'DEPARTMENT', b: 'DEPARTMENT', same: true }
  ]);
});

test('大文字小文字を区別する', () => {
  const result = compareHeaders(['ID', 'NAME'], ['id', 'NAME']);

  assert.equal(result.matchesExactly, false);
  assert.equal(result.sameColumnMultiset, false);
  assert.equal(result.sameOrder, false);
  assert.deepStrictEqual(result.onlyA, [{ name: 'ID', count: 1 }]);
  assert.deepStrictEqual(result.onlyB, [{ name: 'id', count: 1 }]);
  assert.deepStrictEqual(result.common, [{ name: 'NAME', count: 1 }]);
});

test('前後の空白を区別する', () => {
  const result = compareHeaders([' NAME', 'EMAIL '], ['NAME', 'EMAIL']);

  assert.equal(result.sameColumnMultiset, false);
  assert.equal(result.sameOrder, false);
  assert.deepStrictEqual(result.onlyA, [
    { name: ' NAME', count: 1 },
    { name: 'EMAIL ', count: 1 }
  ]);
  assert.deepStrictEqual(result.onlyB, [
    { name: 'NAME', count: 1 },
    { name: 'EMAIL', count: 1 }
  ]);
  assert.deepStrictEqual(result.common, []);
});

test('日本語ヘッダーを文字列のまま比較する', () => {
  const headers = ['顧客番号', '氏名', '部署名'];
  const result = compareHeaders(headers, [...headers]);

  assert.equal(result.matchesExactly, true);
  assert.deepStrictEqual(result.common, headers.map((name) => ({ name, count: 1 })));
});

test('Unicodeの異なる文字列を正規化せず区別する', () => {
  const composed = '\u00e9';
  const decomposed = 'e\u0301';
  const result = compareHeaders([composed], [decomposed]);

  assert.equal(result.matchesExactly, false);
  assert.equal(result.sameColumnMultiset, false);
  assert.deepStrictEqual(result.onlyA, [{ name: composed, count: 1 }]);
  assert.deepStrictEqual(result.onlyB, [{ name: decomposed, count: 1 }]);
  assert.deepStrictEqual(result.common, []);
});

test('quoted commaをparseCsv経由のヘッダーとして比較する', () => {
  const headersFromCsv = parseCsv('"Last, First",ID')[0];
  const result = compareHeaders(headersFromCsv, ['Last, First', 'ID']);

  assert.equal(result.matchesExactly, true);
  assert.deepStrictEqual(result.common, [
    { name: 'Last, First', count: 1 },
    { name: 'ID', count: 1 }
  ]);
});

test('escaped quoteをparseCsv経由のヘッダーとして比較する', () => {
  const headersFromCsv = parseCsv('"He said ""yes""",ID')[0];
  const result = compareHeaders(headersFromCsv, ['He said "yes"', 'ID']);

  assert.equal(result.matchesExactly, true);
  assert.deepStrictEqual(result.common, [
    { name: 'He said "yes"', count: 1 },
    { name: 'ID', count: 1 }
  ]);
});

test('重複ヘッダーの個数差を差分個数で返す', () => {
  const result = compareHeaders(['ID', 'ID', 'NAME'], ['ID', 'NAME']);

  assert.equal(result.matchesExactly, false);
  assert.equal(result.sameColumnMultiset, false);
  assert.deepStrictEqual(result.onlyA, [{ name: 'ID', count: 1 }]);
  assert.deepStrictEqual(result.onlyB, []);
  assert.deepStrictEqual(result.common, [
    { name: 'ID', count: 1 },
    { name: 'NAME', count: 1 }
  ]);
});

test('重複ヘッダーの個数が同じなら完全一致として扱う', () => {
  const result = compareHeaders(['ID', 'ID', 'NAME'], ['ID', 'ID', 'NAME']);

  assert.equal(result.matchesExactly, true);
  assert.equal(result.sameColumnMultiset, true);
  assert.equal(result.sameOrder, true);
  assert.deepStrictEqual(result.common, [
    { name: 'ID', count: 2 },
    { name: 'NAME', count: 1 }
  ]);
});

test('入力配列を変更しない', () => {
  const headersA = ['NAME', 'ID', 'ID'];
  const headersB = ['ID', 'NAME'];
  const originalA = [...headersA];
  const originalB = [...headersB];

  compareHeaders(headersA, headersB);

  assert.deepStrictEqual(headersA, originalA);
  assert.deepStrictEqual(headersB, originalB);
});

test('多列ヘッダーを実用的な時間で比較する', () => {
  const headersA = Array.from({ length: 1000 }, (_, index) => 'column-' + index);
  const headersB = [...headersA];
  const result = compareHeaders(headersA, headersB);

  assert.equal(result.matchesExactly, true);
  assert.equal(result.columnCountA, 1000);
  assert.equal(result.columnCountB, 1000);
  assert.equal(result.common.length, 1000);
  assert.equal(result.positions.length, 1000);
  assert.deepStrictEqual(result.common[0], { name: 'column-0', count: 1 });
  assert.deepStrictEqual(result.common[999], { name: 'column-999', count: 1 });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { extractColumns, parseCsv, serializeCsv, validateCsv } from '../shared/csv-columns-core.js';
import { findDuplicateGroups } from '../shared/csv-duplicate-core.js';

const csv = (text) => { const records = parseCsv(text); validateCsv(records); return records; };
const result = (text, keys) => findDuplicateGroups(csv(text), keys);

test('重複なしを返す', () => { const r = result('ID,NAME\n1,A\n2,B', [0]); assert.equal(r.duplicateGroupCount, 0); assert.equal(r.duplicateRowCount, 0); });
test('1列キーの2件重複と最初の出現を含める', () => { const r = result('ID,NAME\nA,田中\nB,鈴木\nA,佐藤', [0]); assert.equal(r.duplicateGroupCount, 1); assert.deepEqual(r.groups[0].rows.map((row) => row.recordNumber), [2, 4]); assert.deepEqual(r.groups[0].rows.map((row) => row.isFirst), [true, false]); });
test('複数列キー、3件以上、複数グループを扱う', () => { const r = result('A,B\nx,1\nx,2\nx,1\ny,1\nx,1\ny,1', [0, 1]); assert.equal(r.duplicateGroupCount, 2); assert.deepEqual(r.groups.map((group) => group.rows.length), [3, 2]); });
test('空欄キー、日本語、Unicodeを完全一致で扱う', () => { const r = result('ID,NAME\n,田中\n,田中\n,😀\n,😀', [0]); assert.equal(r.duplicateGroupCount, 1); assert.equal(r.duplicateRowCount, 4); });
test('大小文字、前後空白、先頭ゼロを区別する', () => { const r = result('ID\nABC\nabc\n A\nA\n001\n1', [0]); assert.equal(r.duplicateGroupCount, 0); });
test('quoted comma、quote、multilineをキーとして扱う', () => { const r = result('A,B\n"a,b","a""b"\n"a,b","a""b"\n"x\ny",z\n"x\ny",q', [0]); assert.equal(r.duplicateGroupCount, 2); assert.deepEqual(r.groups.map((group) => group.keyValues[0]), ['a,b', 'x\ny']); });
test('重複ヘッダーは列indexで区別する', () => { const r = result('ID,ID\nA,1\nA,2\nB,1\nA,1', [1]); assert.equal(r.duplicateGroupCount, 1); assert.deepEqual(r.groups[0].rows.map((row) => row.recordNumber), [2, 4, 5]); });
test('キー列0件は停止し、元データ・行順を維持する', () => { const records = csv('ID,NAME\nA,一\nB,二\nA,三'); const original = structuredClone(records); assert.throws(() => findDuplicateGroups(records, []), /重複判定/); const r = findDuplicateGroups(records, [0]); assert.deepEqual(r.duplicateRecords, [['ID','NAME'], ['A','一'], ['A','三']]); assert.deepEqual(records, original); });
test('Download用CSVは元列順・値を保持して正しくserializeできる', () => { const r = result('ID,NOTE\n001,"a,b"\n002,x\n001,"a,b"', [0]); assert.equal(serializeCsv(r.duplicateRecords), 'ID,NOTE\r\n001,"a,b"\r\n001,"a,b"'); });
test('50,000行で重複を実用的な時間で検出する', () => { const records = [['ID', 'VALUE'], ...Array.from({ length: 50000 }, (_, index) => [`K${index % 1000}`, String(index)])]; const started = performance.now(); const r = findDuplicateGroups(records, [0]); assert.equal(r.duplicateGroupCount, 1000); assert.equal(r.duplicateRowCount, 50000); assert.ok(performance.now() - started < 3000); });

import test from 'node:test';
import assert from 'node:assert/strict';
import { compareLists, values } from '../shared/list-compare-core.js';
const defaults = { ignoreEmptyLines: true, trimWhitespace: true, caseSensitive: true };
const result = (a, b, options = defaults) => compareLists(a, b, options);
const output = (r) => [values(r.aOnly), values(r.both), values(r.bOnly)];

test('基本比較と入力順を維持する', () => assert.deepEqual(output(result('A003\nA001\nA002', 'A002\nA004\nA003')), [['A001'], ['A003','A002'], ['A004']]));
test('両方空は空の比較結果になる', () => assert.deepEqual(output(result('', '')), [[], [], []]));
test('片側だけの入力を比較できる', () => assert.deepEqual(output(result('', 'B001\nB002')), [[], [], ['B001','B002']]));
test('重複は集合として比較し重複件数を返す', () => { const r = result('A\nA\nB', 'A\nC'); assert.equal(r.a.duplicates, 1); assert.deepEqual(output(r), [['B'], ['A'], ['C']]); });
test('空行を無視する', () => { const r = result('A\n \n\nB', 'B'); assert.equal(r.a.validLines, 2); assert.deepEqual(values(r.aOnly), ['A']); });
test('前後空白の無視を切り替えられる', () => { assert.deepEqual(values(result(' A ', 'A').both), [' A ']); assert.deepEqual(values(result(' A ', 'A', {...defaults, trimWhitespace:false}).both), []); });
test('大文字小文字の区別を切り替えられる', () => { assert.deepEqual(values(result('ABC', 'abc').both), []); assert.deepEqual(values(result('ABC', 'abc', {...defaults, caseSensitive:false}).both), ['ABC']); });
test('日本語とUnicode文字を比較できる', () => assert.deepEqual(output(result('顧客A\n😀\né', '😀\né\n顧客B')), [['顧客A'], ['😀','é'], ['顧客B']]));
test('TXT出力用の値は改変前の表示値を保持する', () => assert.equal(values(result('  A001  ', 'A001').both).join('\n'), '  A001  '));
test('数万行を実用的な時間で比較できる', () => { const n = 30000; const a = Array.from({length:n},(_,i)=>`A${i}`).join('\n'); const b = Array.from({length:n},(_,i)=>`A${i+15000}`).join('\n'); const started = performance.now(); const r = result(a,b); assert.equal(r.both.length,15000); assert.ok(performance.now()-started < 3000); });

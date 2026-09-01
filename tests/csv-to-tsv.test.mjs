import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import { CsvError, parseCsv, validateCsv } from '../shared/csv-columns-core.js';
import { serializeTsv } from '../shared/csv-to-tsv-core.js';

function parseValid(text) {
  const records = parseCsv(text);
  validateCsv(records);
  return records;
}

test('基本のCSVをUTF-8 BOM付きCRLF TSVへ変換する', () => {
  assert.equal(serializeTsv([['ID', 'NAME'], ['001', '田中']]), '\uFEFFID\tNAME\r\n001\t田中');
});

test('カンマだけを含む値はquoteせず、TABを含む値はquoteする', () => {
  assert.equal(serializeTsv([['A', 'B'], ['a,b', 'x\ty']]), '\uFEFFA\tB\r\na,b\t"x\ty"');
});

test('ダブルクォート、CR、LFを含む値をquoteし内部quoteをescapeする', () => {
  assert.equal(serializeTsv([['A', 'B', 'C'], ['say "hi"', 'line\rnext', 'one\ntwo']],), '\uFEFFA\tB\tC\r\n"say ""hi"""\t"line\rnext"\t"one\ntwo"');
});

test('空値、日本語、Unicode、先頭ゼロを文字列のまま保持する', () => {
  const records = parseValid('ID,NAME,VALUE\n001,田中,😀\n000123,,é');
  const output = serializeTsv(records);
  assert.equal(output, '\uFEFFID\tNAME\tVALUE\r\n001\t田中\t😀\r\n000123\t\té');
});

test('multiline CSV fieldをTSVのquote付きfieldとして保持する', () => {
  const records = parseValid('ID,NOTE\n001,"一行目\n二行目"');
  assert.equal(serializeTsv(records), '\uFEFFID\tNOTE\r\n001\t"一行目\n二行目"');
});

test('入力recordsと入力行をmutationしない', () => {
  const records = [['A', 'B'], ['1', '2']];
  const copy = records.map((row) => row.slice());
  serializeTsv(records);
  assert.deepEqual(records, copy);
});

test('空入力や不正なrecordをrejectする', () => {
  assert.throws(() => serializeTsv([]), /ヘッダー行がありません/);
  assert.throws(() => serializeTsv([['A'], ['1', '2']]), /列数が一致/);
  assert.throws(() => serializeTsv(null), CsvError);
  assert.throws(() => serializeTsv([['A'], [1]]), /文字列として/);
});

test('50,000行程度をTSVへ変換する', () => {
  const records = [['ID', 'VALUE'], ...Array.from({ length: 50000 }, (_, index) => [String(index), `値${index}`])];
  const started = performance.now();
  const output = serializeTsv(records);
  assert.ok(output.startsWith('\uFEFFID\tVALUE\r\n0\t値0'));
  assert.ok(output.endsWith('49999\t値49999'));
  assert.ok(performance.now() - started < 3000);
});

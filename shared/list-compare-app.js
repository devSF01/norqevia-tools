import { compareLists, values } from './list-compare-core.js';

const $ = (id) => document.getElementById(id);
const labels = { aOnly: 'Aにだけある', both: '両方にある', bOnly: 'Bにだけある' };
let latestResults = null;

function options() {
  return {
    ignoreEmptyLines: $('ignore-empty').checked,
    trimWhitespace: $('trim-whitespace').checked,
    caseSensitive: $('case-sensitive').checked
  };
}

function fillStats(prefix, stats) {
  $('stats-' + prefix).innerHTML = [
    ['入力行数', stats.inputLines], ['有効行数', stats.validLines],
    ['ユニーク件数', stats.unique.length], ['重複件数', stats.duplicates]
  ].map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`).join('');
}

function renderResult(name, entries) {
  $('count-' + name).textContent = `${entries.length}件`;
  $('list-' + name).value = values(entries).join('\n');
}

function announce(message, error = false) {
  const el = $('notice');
  el.textContent = message;
  el.classList.toggle('error', error);
}

function compare() {
  const aText = $('list-a').value;
  const bText = $('list-b').value;
  if (aText.trim() === '' && bText.trim() === '') {
    announce('比較するデータを入力してください。', true);
    return;
  }
  latestResults = compareLists(aText, bText, options());
  fillStats('a', latestResults.a);
  fillStats('b', latestResults.b);
  renderResult('aOnly', latestResults.aOnly);
  renderResult('both', latestResults.both);
  renderResult('bOnly', latestResults.bOnly);
  announce('比較結果を更新しました。');
}

async function copy(name) {
  const text = $('list-' + name).value;
  try {
    await navigator.clipboard.writeText(text);
    announce(`${labels[name]}をコピーしました。`);
  } catch {
    $('list-' + name).focus();
    $('list-' + name).select();
    const copied = document.execCommand('copy');
    announce(copied ? `${labels[name]}をコピーしました。` : 'コピーできませんでした。テキストを選択してコピーしてください。', !copied);
  }
}

function download(name, filename) {
  const blob = new Blob([$('list-' + name).value], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
  $('compare').addEventListener('click', compare);
  for (const [name, filename] of [['aOnly', 'a-only.txt'], ['both', 'both.txt'], ['bOnly', 'b-only.txt']]) {
    $('copy-' + name).addEventListener('click', () => copy(name));
    $('save-' + name).addEventListener('click', () => download(name, filename));
  }
});

export { compare };

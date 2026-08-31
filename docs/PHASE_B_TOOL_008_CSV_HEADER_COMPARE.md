# Phase B / Tool #008 実装仕様: CSVヘッダー比較

## 1. 目的
Phase BのTool #008として「CSVヘッダー比較」を追加する。Phase Aで完成したTool Factory v2を使い、Scaffold → Tool固有実装 → 自動テスト → Human Gate → publish の標準フローを実地運用する。

## 2. Tool基本情報
- Tool番号: 8
- Tool名: CSVヘッダー比較
- id: `csv-header-compare`
- category: `CSV`
- template: `csv`
- slug: `header-compare`
- URL: `/csv/header-compare/`
- description: `2つのCSVの列名と列順を比較し、ヘッダーの違いを確認できます。`

Scaffoldは必ず `status: "draft"` で作成する。

想定コマンド:

```text
pnpm run create-tool -- --id csv-header-compare --number 8 --name "CSVヘッダー比較" --category "CSV" --template csv --slug header-compare --description "2つのCSVの列名と列順を比較し、ヘッダーの違いを確認できます。"
```

## 3. 機能
2つのCSVファイルを読み込み、ヘッダー行だけを比較する。

確認できる内容:
- 完全一致しているか
- Aにだけ存在する列
- Bにだけ存在する列
- 両方に存在する列
- 同じ列名集合でも列順が違うか

データ行の内容比較は行わない。

代表用途:
- システム出力CSVのフォーマット変更確認
- 月次CSVの列構成差異確認
- 取込前の列名・列順チェック
- CSV結合前のヘッダー確認

## 4. 非スコープ
- データ行の差分比較
- CSV自動修正
- ヘッダー名変更
- 列順自動変更
- 大文字小文字無視
- trim比較
- fuzzy match
- 類似列名推測
- CSV結合
- 複数ファイル一括比較
- Shift_JIS / CP932
- 外部API / AI API

## 5. 入力
CSVファイルA、CSVファイルBの2ファイル。

既存CSV Toolと同じ入力仕様:
- UTF-8
- UTF-8 BOM付き可
- カンマ区切り
- ヘッダー必須
- quoted comma対応
- escaped quote対応
- multiline field対応
- Shift_JIS / CP932非対応

CSV parse / validateは既存 `shared/csv-columns-core.js` 等の共通資産を再利用する。

## 6. 比較仕様

### 6.1 完全一致
以下をすべて満たす場合だけ完全一致。
- 列数が同じ
- 各indexのヘッダー文字列が完全一致
- 列順が同じ

### 6.2 文字列
完全一致で比較する。`ID` と `id`、`NAME` と ` NAME`、空白差、Unicode上の異なる文字列を区別する。trim、case folding、Unicode normalization等は行わない。

### 6.3 Aのみ / Bのみ / 共通
同一文字列の列名について差異を表示する。

### 6.4 列順
同じ列名集合でもindexが異なる場合は「列順が異なる」とする。

例:

A:
```text
ID,NAME,DEPARTMENT
```

B:
```text
NAME,ID,DEPARTMENT
```

結果:
- 完全一致: いいえ
- Aのみ: なし
- Bのみ: なし
- 共通: ID / NAME / DEPARTMENT
- 列順: 異なる

### 6.5 重複ヘッダー
重複ヘッダーの出現回数を失わないこと。

A:
```text
ID,ID,NAME
```

B:
```text
ID,NAME
```

は同じ列集合として扱わず、A側に `ID` が1列多い差異として表現する。

## 7. core
DOM非依存の純粋ロジックにする。

推奨:
`shared/csv-header-compare-core.js`

最低限、次に相当する情報を返す。
- `matchesExactly`
- `sameColumnMultiset`
- `sameOrder`
- `columnCountA`
- `columnCountB`
- `onlyA`
- `onlyB`
- `common`
- `positions`

入力配列をmutationしない。

## 8. UI
既存CSV Toolの視覚言語を使用する。

基本フロー:
1. CSV Aを選択
2. CSV Bを選択
3. 「ヘッダーを比較」
4. 結果概要
5. 詳細表示

各ファイル概要:
- ファイル名
- ファイルサイズ
- 列数
- データ行数

結果概要:
- 完全一致: はい / いいえ
- A列数
- B列数
- Aのみの列数
- Bのみの列数
- 共通列数
- 列順: 同じ / 異なる

詳細:
- Aにだけある列
- 両方にある列
- Bにだけある列
- 列順差異

差異がないカテゴリは「なし」と表示する。
列番号を表示する場合は利用者向けに1始まり。

## 9. Download
Tool #008ではDownload機能を実装しない。比較結果を画面で確認するToolとする。

## 10. エラー
- A未選択
- B未選択
- UTF-8として読めない
- CSV構文エラー
- ヘッダーなし
- 既存validatorがrejectするCSV

曖昧入力を補正しない。

## 11. ページコンテンツ
Factory標準のH1、lead、privacy note、使い方、入力例、仕様・制限、FAQ、関連Toolを含める。

H1:
`CSVヘッダー比較`

lead:
`2つのCSVの列名と列順を比較して、列構成の違いを確認できます。`

FAQ最低限:
1. データ行の内容も比較しますか？
2. 大文字小文字は区別しますか？
3. 列順が違うだけでも差異になりますか？
4. 同じ列名が複数あるCSVはどう扱いますか？
5. ファイルはアップロードされますか？
6. 元CSVは変更されますか？

関連Tool:
- CSV結合
- CSV列抽出・列削除
- CSV重複チェック

## 12. SEO
- title: `CSVヘッダー比較 | 仕事データツール`
- canonical: `https://tools.norqevia.com/csv/header-compare/`
- OGP URL: canonicalと同じ
- H1: `CSVヘッダー比較`

meta descriptionは「2つのCSV」「ヘッダー」「列名」「列順」「比較」「ブラウザ内処理」が自然に伝わる文章にする。

## 13. Unit Test
最低限:
1. 完全一致
2. 列数違い
3. Aのみ
4. Bのみ
5. A/B双方に固有列
6. 同じ列集合で列順だけ違う
7. 大文字小文字を区別
8. 前後空白を区別
9. 日本語ヘッダー
10. Unicode
11. quoted commaを含むヘッダー
12. escaped quoteを含むヘッダー
13. 重複ヘッダーの個数差
14. 重複ヘッダーを含めても完全一致
15. 入力をmutationしない
16. 多列CSVでも実用時間内

CSV parser自体の網羅テストを重複させない。

## 14. Browser Test
主要シナリオ:
1. `/csv/header-compare/`
2. A/BにUTF-8 CSV設定
3. 比較実行
4. Aのみ・Bのみ確認
5. 共通列確認
6. 列順差異確認
7. Offlineへ切替
8. 別CSVで再比較
9. 正常動作
10. Tool入力データ由来の外部通信なし
11. Console Errorなし

スマートフォン:
- viewport 390x844
- ファイル入力と比較ボタンが操作可能
- `body.scrollWidth <= window.innerWidth`

## 15. Network / Privacy
Tool入力CSVや比較結果を外部送信しない。Tool #008固有実装に外部通信処理を追加しない。

## 16. Human Gate
`docs/HUMAN_GATE.md` にTool #008を追加する。

- [ ] 実際の異なる2つの業務系CSVで列構成差異が直感的に分かる
- [ ] Aのみ / 共通 / Bのみの表示が理解しやすい
- [ ] 列順だけが異なるケースを理解しやすい
- [ ] 重複ヘッダーがある場合も誤解しにくい
- [ ] 日本語表現・PC/スマートフォン表示に違和感がない

## 17. Factory運用
Tool Factory Scaffoldを必ず使用する。実装後も `tools.json` は `draft` のままとする。Scaffold markerをTool固有実装完了時にすべて除去する。

Factoryの一般的問題を発見した場合だけFactory側を修正し、regression testを追加する。

## 18. 完成定義
- [ ] ScaffoldからTool #008をdraft作成
- [ ] Tool固有UI完成
- [ ] core/app責務分離
- [ ] 既存CSV共通資産再利用
- [ ] 重複ヘッダーを含む比較仕様を実装
- [ ] Unit Test追加
- [ ] Browser Test追加
- [ ] Network Isolation通過
- [ ] build通過
- [ ] 全既存Unit Test通過
- [ ] 全Browser Test通過
- [ ] Human Gate追記
- [ ] Scaffold marker全除去
- [ ] `tools.json` はTool #008をdraftで保持
- [ ] 既存7 Toolにregressionなし
- [ ] 実装・テスト・Factory改善点を完了報告

Human Gate、published化、push、Tool #009以降は今回の依頼範囲外。

# Phase B / Tool #010 実装仕様: CSV空欄セルチェック

## 1. 位置づけ
Phase BのTool #010として「CSV空欄セルチェック」を追加する。Phase Aで完成したTool Factory v2を使用し、Scaffold → Tool固有実装 → 自動テスト → Human Gate → publish の標準フローに従う。CSVを変更せず、空欄セルの位置と件数を確認する検査Toolとする。

## 2. Tool基本情報
- Tool番号: 10
- Tool名: CSV空欄セルチェック
- id: `csv-empty-cell-check`
- category: `CSV`
- template: `csv`
- slug: `empty-cell-check`
- URL: `/csv/empty-cell-check/`
- description: `CSV内の空欄セルを列ごと・行ごとに確認し、空欄の位置と件数をチェックできます。`

Scaffoldは必ず `status: "draft"` で作成する。

想定コマンド:
```text
pnpm run create-tool -- --id csv-empty-cell-check --number 10 --name "CSV空欄セルチェック" --category "CSV" --template csv --slug empty-cell-check --description "CSV内の空欄セルを列ごと・行ごとに確認し、空欄の位置と件数をチェックできます。"
```

## 3. 目的
CSVを読み込み、データ行に含まれる空欄セルを検出して以下を確認する。
- 空欄セル総数
- 空欄を含むデータ行数
- 列ごとの空欄数
- 空欄セルの具体的な行・列位置

代表用途:
- 取込前CSVの必須項目漏れ確認
- エクスポートCSVの欠損確認
- 手作業編集後の空欄確認
- CSV整形前の品質チェック

## 4. 非スコープ
- 空欄セルの自動補完
- 空欄行/空欄セルを含む行の削除
- 必須列ルール保存
- 型チェック
- 数値・日付妥当性検証
- whitespace-onlyを空欄とみなすオプション
- trim / Unicode normalization
- 複数ファイル一括検査
- Shift_JIS / CP932
- 外部API / AI API
- 検査結果Download

## 5. 入力
CSVファイル1つ。既存CSV Toolと同じ仕様を使う。
- UTF-8 / UTF-8 BOM付き可
- カンマ区切り
- ヘッダー必須
- quoted comma / escaped quote / multiline field対応
- Shift_JIS / CP932非対応

CSV parse / validateは既存 `shared/csv-columns-core.js` を再利用する。

## 6. 空欄判定仕様
### 6.1 対象
- ヘッダー行は検査対象外
- データ行のみ
- 全列を検査

### 6.2 空欄の定義
値が厳密に空文字列 `""` のセルだけを空欄とする。

以下は空欄とみなさない。
- `" "` 半角スペース
- `"　"` 全角スペース
- タブ
- `"0"`
- `"NULL"` / `"null"` / `"N/A"` / `"-"`

trimや意味解釈を行わない。

### 6.3 行番号・列番号
利用者向け表示は1始まり。
- ヘッダー = 1行目
- 最初のデータ行 = 2行目
- 最初の列 = 1列目

### 6.4 重複ヘッダー
列indexで区別し、既存 `columnLabel(headers, index)` と同等の表記を再利用する。

### 6.5 元データ
入力recordsをmutationしない。

## 7. core
DOM非依存の純粋ロジックとして実装する。

推奨: `shared/csv-empty-cell-check-core.js`

最低限、次に相当する情報を返す。
- `dataRowCount`
- `columnCount`
- `emptyCellCount`
- `rowsWithEmptyCount`
- `columns`
- `emptyCells`

`columns` は columnIndex / header / emptyCount 相当を保持。
`emptyCells` は recordNumber / dataRowNumber / columnIndex / header 相当を保持。
大量CSVで不要な複製を増やさない。

## 8. UI
既存CSV Toolの視覚言語を使用する。

基本フロー:
1. CSVファイルを選択
2. ファイル概要
3. 「空欄セルをチェック」
4. 結果概要
5. 列別集計
6. 空欄位置一覧

ファイル概要:
- ファイル名
- ファイルサイズ
- 列数
- データ行数

結果概要:
- 空欄セル総数
- 空欄を含むデータ行数
- データ行数
- 列数

0件時は成功として `空欄セルは見つかりませんでした。` 等を表示。

列別集計では各列の空欄数を表示する。大量列では空欄あり列を優先するなど、既存UIに合う範囲で整理してよい。

空欄位置一覧:
- CSV行番号
- 列名
- 列番号

大量の空欄をDOMへ全件描画しない。先頭100件程度に制限し、総数と「先頭100件を表示」等を明示する。

## 9. Download
実装しない。CSVを変更しない検査Toolとする。

## 10. エラー
- ファイル未選択
- UTF-8として読めない
- CSV構文エラー
- ヘッダーなし
- 列数不整合

曖昧入力を補正しない。

## 11. ページコンテンツ
Factory標準構造を維持。

H1: `CSV空欄セルチェック`

lead:
`CSV内の空欄セルを検出し、どの行・どの列に空欄があるかをブラウザ上で確認できます。`

使い方:
1. CSVを選択
2. 「空欄セルをチェック」
3. 空欄セル総数と列別件数を確認
4. 行番号・列名から空欄位置を確認

入力例:
```text
ID,NAME,EMAIL
001,田中,tanaka@example.com
002,鈴木,
003,,sato@example.com
```

期待:
- 空欄セル: 2件
- EMAIL: 1件
- NAME: 1件
- 3行目 EMAIL
- 4行目 NAME

仕様・制限:
- データ行だけ検査
- 厳密な空文字列だけ空欄扱い
- スペースのみは空欄扱いしない
- trim等の暗黙変換なし
- CSVを変更しない
- UTF-8のみ
- ブラウザ内処理

FAQ最低限:
1. スペースだけのセルも空欄になりますか？
2. `NULL` や `N/A` は空欄になりますか？
3. ヘッダーの空欄もチェックしますか？
4. CSVを自動で修正しますか？
5. 大量に空欄がある場合は全部表示されますか？
6. ファイルはアップロードされますか？
7. 元CSVは変更されますか？

関連Tool:
- CSV空欄行削除
- CSV列抽出・列削除
- CSVヘッダー比較

## 12. SEO
- title: `CSV空欄セルチェック | 仕事データツール`
- canonical: `https://tools.norqevia.com/csv/empty-cell-check/`
- OGP URL: canonicalと同じ
- H1: `CSV空欄セルチェック`

meta descriptionはCSV / 空欄 / セル / チェック / 行 / 列 / ブラウザ内処理が自然に伝わる文にする。

## 13. Unit Test
最低限:
1. 空欄なし
2. 1セル空欄
3. 1行に複数空欄
4. 複数行に空欄
5. 同一列に複数空欄
6. 複数列に空欄
7. 空文字列だけを空欄扱い
8. 半角スペースは非空欄
9. 全角スペースは非空欄
10. `0` は非空欄
11. `NULL` / `N/A` は非空欄
12. 日本語ヘッダー
13. Unicode
14. quoted empty field
15. quoted comma / quote / multilineを含む周辺データ
16. 重複ヘッダーをindexで区別
17. CSV行番号が正しい
18. input mutationなし
19. 空欄0件時の集計
20. 50,000行×複数列を実用時間内

parser自体の既存網羅テストは重複させすぎない。

## 14. Browser Test
主要シナリオ:
1. `/csv/empty-cell-check/`
2. UTF-8 BOM付きCSV
3. チェック実行
4. 空欄総数/空欄行数/列別件数確認
5. 行番号・列名確認
6. 空欄0件CSVで再実行
7. 成功メッセージ確認
8. Offlineに切替
9. 再実行して正常動作
10. Tool入力データ由来の外部通信なし
11. Console Errorなし

スマートフォン:
- viewport 390x844
- ファイル入力・実行・結果確認が操作可能
- `body.scrollWidth <= window.innerWidth`

## 15. Network / Privacy
Tool入力CSVや検査結果を外部送信しない。
Tool #010固有実装にfetch / XHR / WebSocket / EventSource / Beacon / 外部APIを追加しない。

## 16. Human Gate
`docs/HUMAN_GATE.md` にTool #010を追加する。

- [ ] 実際の業務系CSVで空欄位置が直感的に分かる
- [ ] CSV行番号と列番号が実ファイルと一致する
- [ ] スペースだけのセルが空欄扱いされない
- [ ] 空欄0件時の表示が分かりやすい
- [ ] 空欄多数でも画面が極端に重くならない
- [ ] 日本語表現・PC/スマートフォン表示に違和感がない

## 17. Factory運用
Tool Factory Scaffoldを必ず使用する。
実装後も `tools.json` は `draft` のままとする。
Scaffold markerをTool固有実装完了時にすべて除去する。
Factoryの一般的問題を発見した場合だけFactory側を修正しregression testを追加する。

## 18. 完成定義
- [ ] ScaffoldからTool #010をdraft作成
- [ ] Tool固有UI完成
- [ ] core/app責務分離
- [ ] 既存CSV共通資産再利用
- [ ] 厳密な空文字列だけを空欄判定
- [ ] 列別集計
- [ ] 行・列位置表示
- [ ] 大量結果のDOM表示制限
- [ ] Unit Test追加
- [ ] Browser Test追加
- [ ] Network Isolation通過
- [ ] build通過
- [ ] 全既存Unit Test通過
- [ ] 全Browser Test通過
- [ ] Human Gate追記
- [ ] Scaffold marker全除去
- [ ] `tools.json` はTool #010をdraftで保持
- [ ] 既存9 Toolにregressionなし
- [ ] 実装・テスト・Factory改善点を完了報告

Human Gate、published化、push、Tool #011以降は今回の依頼範囲外。

## 19. #010完了後の区切り
Tool #010公開後、Phase B最初の4本（#007〜#010）のFactory運用を総括する。

評価対象:
- Scaffoldから実装開始までの手間
- Tool固有仕様の平均的な複雑さ
- 共通CSV基盤の再利用状況
- 重複コード
- Browser Test追加コスト
- Human Gateの負担
- Factory自体の修正発生有無
- 次の増産を1本単位から小規模batchへ移せるか

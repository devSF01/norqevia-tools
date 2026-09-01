# Phase B.2 / Batch #011–#015 実装仕様

## 1. 目的
Tool Factory v2 の実地検証を終えたため、Phase B.2では新Toolを5本まとめて実装する。

対象:
- #011 CSV行数・列数カウント
- #012 CSV行フィルター
- #013 CSV列名変更
- #014 CSV→TSV変換
- #015 CSV→JSON変換

共通仕様・公開ルール・Privacy・SEO・Scaffold・draft隔離・marker・テスト・Human Gateは `docs/TOOL_FACTORY.md` と `docs/HUMAN_GATE.md` をSource of Truthとし、本書ではTool固有仕様だけを定義する。

全ToolをScaffoldから `draft` で生成し、Lunaの実装完了時点でも5本すべて `draft` のままとする。Human Gate、published化、pushは今回の実装依頼範囲外。

## 2. Batch共通方針
- 既存 `shared/csv-columns-core.js` のCSV parser / validator / serializer / UTF-8 / BOM / `columnLabel()` / `outputFilename()` を必要に応じて再利用する。
- 同じ責務をToolごとに複製しない。
- 5本の実装中に3回以上ほぼ同じUI/helper処理が現れ、自然に共通化できる場合のみ小さな共通helper化を許可する。
- 過剰抽象化はしない。
- Tool固有coreはDOM非依存。
- 入力recordsをmutationしない。
- 暗黙のtrim、数値化、日付化、case folding、Unicode normalization等を行わない。
- Tool入力データ・処理結果を外部送信しない。
- Browser Testでは既存の外部通信・Console Error・Offline・390x844確認パターンを踏襲する。
- Batch中にFactory一般不具合を発見した場合のみFactory側を修正しregression testを追加する。

# 3. Tool #011 CSV行数・列数カウント

## 基本情報
- number: 11
- name: `CSV行数・列数カウント`
- id: `csv-row-column-count`
- category: `CSV`
- template: `csv`
- slug: `row-column-count`
- URL: `/csv/row-column-count/`
- description: `CSVのデータ行数と列数をブラウザ上ですぐに確認できます。`

## 固有仕様
CSVを変更せず、以下を表示する。
- 列数
- データ行数
- CSV全体のrecord数（ヘッダー込み）
- ヘッダー一覧
- ファイル名
- ファイルサイズ

ヘッダーは1行目、データ行数はヘッダーを除く。quoted multiline field内の改行を行数として数えず、既存parserのrecord単位を使う。Downloadなし。重複ヘッダーは `columnLabel()` で区別する。

## Unit Test
- ヘッダーのみ
- 1行 / 複数行
- quoted multiline
- quoted comma / escaped quote
- 日本語 / Unicode
- 重複ヘッダー
- record数とdata row数
- mutationなし
- 50,000行程度

## Human Gate
- 実CSVの行数・列数と一致
- multiline fieldでも利用者の期待するデータ行数になる
- ヘッダー一覧が読みやすい

# 4. Tool #012 CSV行フィルター

## 基本情報
- number: 12
- name: `CSV行フィルター`
- id: `csv-row-filter`
- category: `CSV`
- template: `csv`
- slug: `row-filter`
- URL: `/csv/row-filter/`
- description: `指定した列の値を条件にCSVの行を絞り込み、新しいCSVとして保存できます。`

## 固有仕様
- キー列: 1列
- 条件: `一致する` / `一致しない`
- 比較値: 利用者入力文字列
- 完全一致
- trimなし
- case foldingなし
- 数値・日付変換なし
- 空文字列も検索値として許可
- ヘッダー保持
- 元の行順保持
- 0件一致も正常結果

推奨core:
`filterCsvRecords(records, columnIndex, operator, value)`

operator:
- `equals`
- `not-equals`

不正columnIndex/operatorはreject。

UI:
1. CSV選択
2. 列選択
3. 条件選択
4. 比較値入力
5. 行を絞り込む
6. 元データ行数 / 抽出行数
7. 先頭20行程度preview
8. CSV保存

出力名: `<stem>-filtered.csv`
UTF-8 BOM + CRLF。

## Unit Test
- equals / not-equals
- 0件 / 全件
- 空文字列検索
- 空白との差
- 大小文字差
- 001 vs 1
- 日本語 / Unicode
- quoted/multiline周辺値保持
- 重複ヘッダーをindexで選択
- 行順保持
- mutationなし
- invalid column/operator
- 50,000行程度

## Human Gate
- 一致 / 一致しないが直感的
- 空文字列検索の意味が誤解されない
- 保存CSVが期待どおり
- 0件時の表示が自然

# 5. Tool #013 CSV列名変更

## 基本情報
- number: 13
- name: `CSV列名変更`
- id: `csv-rename-columns`
- category: `CSV`
- template: `csv`
- slug: `rename-columns`
- URL: `/csv/rename-columns/`
- description: `CSVの列名だけを変更し、データ内容を変えずに新しいCSVとして保存できます。`

## 固有仕様
- 全列を一覧表示
- 各列の新しいヘッダー名を入力可能
- 初期値は元ヘッダー
- 入力文字列をそのまま採用
- 空文字列ヘッダーを許可
- 重複した新ヘッダー名も許可
- trimしない
- データ行と列順は完全保持
- 変更なしでも正常に新CSV作成可能

推奨core:
`renameCsvHeaders(records, newHeaders)`

検証:
- newHeadersが配列
- 元列数と同数
- input mutationなし

UI:
1. CSV選択
2. 現在列名 / 新列名の編集一覧
3. 列名を変更
4. preview
5. CSV保存

出力名: `<stem>-renamed-columns.csv`
UTF-8 BOM + CRLF。

## Unit Test
- 1列 / 複数列変更
- 変更なし
- 空ヘッダー
- 重複ヘッダー生成
- 空白 / 大小文字 / Unicode保持
- データ行完全保持
- quoted/multiline保持
- ヘッダー数不一致reject
- mutationなし
- 50,000行程度

## Human Gate
- 元列名と新列名の対応が分かりやすい
- 重複列名でも対象を取り違えにくい
- データ内容が変化しない
- 空ヘッダーを許す仕様が不自然でない

# 6. Tool #014 CSV→TSV変換

## 基本情報
- number: 14
- name: `CSV→TSV変換`
- id: `csv-to-tsv`
- category: `CSV`
- template: `csv`
- slug: `to-tsv`
- URL: `/csv/to-tsv/`
- description: `CSVをタブ区切りのTSVへ変換し、新しいファイルとして保存できます。`

## 固有仕様
既存CSV parserでrecords化しTSVとして保存。

TSV出力:
- UTF-8 BOM付き
- CRLF
- delimiterはTAB
- 値は文字列のまま
- TAB、CR、LF、`"` を含む値はダブルクォート
- フィールド内 `"` は `""` にescape
- カンマだけを含む値はTSVではquote必須ではない
- 元CSVは変更しない

CSV共通serializerを無理に改造しない。delimiter一般化が自然なら共通helperへ抽出してよいが、既存CSV出力の挙動は変えない。

推奨API:
- `serializeTsv(records)`
または
- `serializeDelimited(records, delimiter)`

UI:
1. CSV選択
2. ファイル概要
3. TSVに変換
4. 先頭20行程度preview
5. TSV保存

出力名: `<stem>.tsv`

## Unit Test
- 基本変換
- カンマ値
- TAB quote
- quote escape
- multiline quote
- 空値
- 日本語 / Unicode / 先頭ゼロ
- BOM / CRLF
- mutationなし
- 50,000行程度

## Human Gate
- Excel等でTSVとして開ける
- 日本語・先頭ゼロ・TAB/quote/multiline値が壊れない
- CSVとTSVの違いの説明が分かりやすい

# 7. Tool #015 CSV→JSON変換

## 基本情報
- number: 15
- name: `CSV→JSON変換`
- id: `csv-to-json`
- category: `CSV`
- template: `csv`
- slug: `to-json`
- URL: `/csv/to-json/`
- description: `CSVの各行をJSONオブジェクトへ変換し、JSONファイルとして保存できます。`

## 固有仕様
CSVヘッダーをJSON objectのkey、各データ行をvalueとしてJSON配列へ変換する。

重複ヘッダーがあるCSVは変換停止する。同一keyを安全に保持できないためであり、勝手に `NAME_2` 等へrenameしない。

空ヘッダーは許可。ただし複数の空ヘッダーは重複としてreject。

- 全値を文字列として出力
- `001` → `"001"`
- `true` → `"true"`
- 空欄 → `""`
- 数値 / boolean / nullへの型推測なし
- データ行順保持
- key順はCSV列順
- 元CSVを変更しない

推奨core:
- `csvRecordsToObjects(records)`
または
- `csvRecordsToJson(records)`

JSON serialization:
- `JSON.stringify(data, null, 2)`
- UTF-8
- BOMなし
- final newline有無は実装内で統一してtest固定

UI:
1. CSV選択
2. ファイル概要
3. JSONに変換
4. 先頭数件JSON preview
5. JSON保存

大量データをDOMへ全件描画しない。

出力名: `<stem>.json`

## Unit Test
- 基本変換
- 001保持
- 空文字列
- true/null風文字列も文字列保持
- 日本語 / Unicode
- quoted comma / quote / multiline
- key順 / row順維持
- 空ヘッダー
- 重複ヘッダーreject
- 重複空ヘッダーreject
- mutationなし
- JSON stringify結果
- 50,000行程度

## Human Gate
- JSON previewが読みやすい
- 先頭ゼロ等が文字列として残る
- 重複ヘッダー時の停止理由が理解しやすい
- 保存JSONを一般的editorで正常に開ける

# 8. Browser Test方針
5本それぞれ主要happy pathとmobile testを追加する。

共通確認:
- 主要操作
- Tool固有結果
- 必要なDownload filename
- Offline再実行
- Tool入力由来の外部通信なし
- Console Error / pageerrorなし
- 390x844で主要操作可能
- horizontal overflowなし

同一の監視セットアップがさらに重複する場合、挙動を変えない小さなtest helperへの抽出を許可する。

# 9. Human Gate
`docs/HUMAN_GATE.md` に #011〜#015 の固有項目を追加する。
自動テストで確認済み事項と人間確認事項を分ける。
Batch実装してもHuman Gateとpublished化はTool単位で行える状態を維持する。

# 10. Batch完成定義
- [ ] #011〜#015をScaffoldから生成
- [ ] 5本すべて `draft`
- [ ] 各Tool固有core/app/page完成
- [ ] 既存CSV共通基盤を再利用
- [ ] 不要な責務重複なし
- [ ] Tool固有Unit Test追加
- [ ] Browser Test追加
- [ ] Network Isolation通過
- [ ] build通過
- [ ] 全既存Unit Test通過
- [ ] 全Browser Test通過
- [ ] Human Gate追記
- [ ] Scaffold marker全除去
- [ ] 既存 #001〜#010 にregressionなし
- [ ] Factory一般問題があれば共通修正＋regression test
- [ ] Luna完了時点で #011〜#015 はpublishedにしない

## 完了報告
1. #011〜#015それぞれの実装概要
2. 変更・追加ファイル
3. 共通資産再利用状況
4. Batch中に新たに共通化したhelper（あれば）
5. 過剰共通化を避けた判断
6. Unit / Browser / Network / build結果
7. Factory一般修正の有無
8. 各ToolのHuman Gate項目
9. 残課題
10. `tools.json` で5本すべてdraftである確認

Human Gate、published化、commit/pushは今回の実装依頼範囲外。

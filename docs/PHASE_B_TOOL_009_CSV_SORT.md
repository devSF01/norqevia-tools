# Phase B / Tool #009 実装仕様: CSV並べ替え

## 1. 位置づけ

Phase BのTool #009として「CSV並べ替え」を追加する。

Phase Aで完成したTool Factory v2を使用し、
Scaffold → Tool固有実装 → 自動テスト → Human Gate → publish
の標準フローに従う。

既存CSV共通資産の parser / validator / serializer / UTF-8処理 / BOM出力 / filename helper を再利用する。

## 2. Tool基本情報

- Tool番号: 9
- Tool名: CSV並べ替え
- id: `csv-sort`
- category: `CSV`
- template: `csv`
- slug: `sort`
- URL: `/csv/sort/`
- description: `指定した列をキーにCSVの行を昇順・降順で並べ替え、新しいCSVとして保存できます。`

Scaffoldは必ず `status: "draft"` で作成する。

想定コマンド:

```text
pnpm run create-tool -- --id csv-sort --number 9 --name "CSV並べ替え" --category "CSV" --template csv --slug sort --description "指定した列をキーにCSVの行を昇順・降順で並べ替え、新しいCSVとして保存できます。"
```

## 3. 目的

1つのCSVを読み込み、利用者が指定した1列をキーとしてデータ行を昇順または降順に並べ替え、新しいCSVとして保存する。

代表用途:

- 氏名順に並べる
- 部署名順に並べる
- コード順に並べる
- 日付文字列を既存表記のまま文字列順で並べる
- 出力CSVを確認しやすい順に整える

## 4. 非スコープ

Phase B #009では以下を実装しない。

- 複数キーによる多段ソート
- 数値としての並べ替え
- 日付としての並べ替え
- 自動型判定
- 自然順ソート（2 < 10 など）
- 大文字小文字を無視したソート
- trim後のソート
- Unicode normalization
- 全角半角変換
- 空欄を先頭/末尾へ固定するオプション
- 行フィルター
- CSV編集
- 複数ファイル一括処理
- Shift_JIS / CP932
- 外部API / AI API

数値・日付ソートは、必要性が確認された場合に将来拡張とする。

## 5. 入力

CSVファイル1つ。

既存CSV Toolと同じ入力仕様:

- UTF-8
- UTF-8 BOM付き可
- カンマ区切り
- ヘッダー必須
- quoted comma対応
- escaped quote対応
- multiline field対応
- Shift_JIS / CP932非対応

CSVの読み込み・検証は既存CSV共通資産を再利用する。

## 6. 並べ替え仕様

### 6.1 対象

- ヘッダー行は常に先頭に保持する
- 並べ替えるのはデータ行のみ
- 利用者は1列だけキー列を選ぶ
- 昇順 / 降順を選べる

### 6.2 比較値

選択列の値を文字列のまま比較する。

以下を行わない。

- Number変換
- Date変換
- trim
- case folding
- Unicode normalization
- 全角半角変換

したがって `001` と `1` は別文字列、`A` と `a` も別文字列として扱う。

### 6.3 比較規則

実装は決定的でブラウザ間差異を最小化すること。

推奨:
JavaScript文字列の大小比較 (`<`, `>`) によるUTF-16 code unit順。

`localeCompare()` / `Intl.Collator` を採用する場合は、ブラウザや環境による照合差を持ち込むため、明確な理由がない限り使用しない。

### 6.4 昇順 / 降順

- 昇順: 小さい文字列 → 大きい文字列
- 降順: 大きい文字列 → 小さい文字列

空文字列は通常の文字列として扱う。

### 6.5 安定ソート

キー値が同一の行については、元CSV内の相対順序を維持する。

実装はsort前に元indexを保持する等により、stableであることを明示的に保証する。

### 6.6 元データ

入力recordsをmutationしない。

新しいrecords配列を返す。

## 7. core

DOM非依存の純粋ロジックとして実装する。

推奨ファイル:

`shared/csv-sort-core.js`

最低限、次に相当する関数を持つ。

```text
sortCsvRecords(records, columnIndex, direction)
```

期待仕様:

- `direction` は `asc` / `desc`
- 不正なcolumnIndexをreject
- 不正なdirectionをreject
- ヘッダー保持
- データ行のみsort
- stable
- input mutationなし

## 8. UI

既存CSV Toolの視覚言語を使用する。

基本フロー:

1. CSVファイルを選択
2. ファイル概要を表示
3. 並べ替え列を1つ選択
4. 昇順 / 降順を選択
5. 「並べ替える」
6. 結果概要
7. 先頭プレビュー
8. 「CSVを保存」

### 8.1 ファイル概要

- ファイル名
- ファイルサイズ
- 列数
- データ行数

### 8.2 列選択

単一選択。

重複ヘッダーがある場合は既存 `columnLabel()` と同等に列番号で区別する。

### 8.3 方向

- 昇順
- 降順

初期値は昇順。

### 8.4 結果概要

最低限:

- 並べ替え列
- 並べ替え方向
- データ行数

### 8.5 Preview

- ヘッダー + 先頭20データ行程度
- 全件はDownload対象
- 大量CSVをDOMへ全件描画しない

## 9. Download

新しいCSVとして保存する。

- UTF-8 BOM付き
- CRLF
- 元の列順を保持
- 全フィールド値を文字列のまま保持
- 元ファイルを上書きしない

出力ファイル名:

`<元ファイル名stem>-sorted.csv`

既存 `outputFilename(inputName, 'sorted')` を優先して再利用する。

## 10. エラー条件

最低限:

- ファイル未選択
- UTF-8として読めない
- CSV構文エラー
- ヘッダーなし
- 列数不整合
- 並べ替え列が未選択
- 不正columnIndex
- 不正direction

曖昧な入力を勝手に補正しない。

## 11. ページコンテンツ

Factory標準のページ構造を維持する。

### H1

`CSV並べ替え`

### lead

`指定した列をキーに、CSVの行を昇順または降順で並べ替えて新しいCSVとして保存できます。`

### 使い方

1. CSVを選択
2. 並べ替える列を選択
3. 昇順または降順を選択
4. 「並べ替える」
5. プレビューを確認して保存

### 入力例

```text
ID,NAME
003,鈴木
001,佐藤
002,田中
```

IDを昇順:

```text
ID,NAME
001,佐藤
002,田中
003,鈴木
```

### 仕様・制限

最低限:

- 1列キー
- 昇順 / 降順
- 文字列として比較
- 数値・日付への自動変換なし
- 同じ値の行は元の順序を維持
- 元CSVは変更しない
- UTF-8のみ
- ブラウザ内処理

### FAQ

最低限:

1. 数字は数値として並びますか？
2. 日付は日付順になりますか？
3. 同じ値の行はどうなりますか？
4. 空欄はどう扱われますか？
5. 複数列で並べ替えできますか？
6. ファイルはアップロードされますか？
7. 元CSVは変更されますか？

「数字は文字列として比較する」ことを利用者に明確に説明する。

### 関連Tool

最低限:

- CSV列抽出・列削除
- CSV重複行削除
- CSVヘッダー比較

## 12. SEO

- title: `CSV並べ替え | 仕事データツール`
- canonical: `https://tools.norqevia.com/csv/sort/`
- OGP URL: canonicalと同じ
- H1: `CSV並べ替え`

meta descriptionは「CSV」「指定列」「昇順」「降順」「並べ替え」「保存」「ブラウザ内処理」が自然に伝わる文章とする。

## 13. Unit Test

最低限:

1. 1列昇順
2. 1列降順
3. ヘッダー保持
4. 行全体がキーに追従
5. 文字列 `001` / `1` を自動数値化しない
6. 大文字小文字を区別
7. 前後空白を区別
8. 空文字列
9. 日本語
10. Unicode
11. quoted comma
12. escaped quote
13. multiline field
14. 重複ヘッダーをindexで選択
15. 同一キーのstable order
16. input mutationなし
17. 不正columnIndex
18. 不正direction
19. serialize後も値保持
20. 50,000行程度を実用時間内

parser自体の既存テストを重複して増やしすぎない。

## 14. Browser Test

主要シナリオ:

1. `/csv/sort/`
2. UTF-8 BOM付きCSVを設定
3. キー列を選択
4. 昇順で実行
5. Preview確認
6. 降順で再実行
7. Preview確認
8. Download filename確認
9. Offlineに切替
10. 再実行して正常動作
11. Tool入力データ由来の外部通信なし
12. Console Errorなし

スマートフォン:

- viewport 390x844
- ファイル入力、列選択、方向選択、実行、保存が操作可能
- `body.scrollWidth <= window.innerWidth`

## 15. Network / Privacy

Tool入力CSVや生成結果を外部送信しない。

Tool #009固有実装にfetch / XHR / WebSocket / EventSource / Beacon / 外部APIを追加しない。

## 16. Human Gate

`docs/HUMAN_GATE.md` にTool #009を追加する。

- [ ] 実際の業務系CSVで指定列の昇順/降順が直感どおり動く
- [ ] 数字が文字列順であることがUI/説明から誤解しにくい
- [ ] 同じキー値の行の元順序が維持される
- [ ] 日本語・先頭ゼロ・引用符を含む値が壊れない
- [ ] Excelで出力CSVを開き内容を確認できる
- [ ] PC/スマートフォン表示に違和感がない

## 17. Factory運用

Tool Factory Scaffoldを必ず使用する。

実装後も `tools.json` は `draft` のままとする。

Scaffold markerをTool固有実装完了時にすべて除去する。

Factoryの一般的問題を発見した場合だけFactory側を修正し、regression testを追加する。

## 18. 完成定義

- [ ] ScaffoldからTool #009をdraft作成
- [ ] Tool固有UI完成
- [ ] core/app責務分離
- [ ] 既存CSV共通資産再利用
- [ ] 1列キー昇順/降順
- [ ] stable sort
- [ ] 暗黙の型変換なし
- [ ] Unit Test追加
- [ ] Browser Test追加
- [ ] Network Isolation通過
- [ ] build通過
- [ ] 全既存Unit Test通過
- [ ] 全Browser Test通過
- [ ] Human Gate追記
- [ ] Scaffold marker全除去
- [ ] `tools.json` はTool #009をdraftで保持
- [ ] 既存8 Toolにregressionなし
- [ ] 実装・テスト・Factory改善点を完了報告

Human Gate、published化、push、Tool #010以降は今回の依頼範囲外。

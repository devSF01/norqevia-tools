# Phase B / Tool #007 実装仕様: CSV重複行削除

## 1. 位置づけ

Phase Bは、Phase Aで完成したTool Factory v2を実際の新Tool追加に使用し、
Scaffold → Tool固有実装 → 自動テスト → Human Gate → publish
の標準ループを実地検証する段階である。

最初の対象を Tool #007「CSV重複行削除」とする。

このToolは既存 Tool #003「CSV重複チェック」と近い責務を持つため、
既存CSV parser / serializer / UTF-8処理、および重複判定に関する既存ロジックを最大限再利用する。

## 2. Tool基本情報

- Tool番号: 7
- Tool名: CSV重複行削除
- id: `csv-remove-duplicates`
- category: `CSV`
- template: `csv`
- slug: `remove-duplicates`
- URL: `/csv/remove-duplicates/`
- description:
  `指定した列をキーにCSVの重複行を削除し、新しいCSVとして保存できます。`

まずFactory Scaffoldを使用し、`status: "draft"` で生成すること。

想定コマンド:

```text
pnpm run create-tool -- --id csv-remove-duplicates --number 7 --name "CSV重複行削除" --category "CSV" --template csv --slug remove-duplicates --description "指定した列をキーにCSVの重複行を削除し、新しいCSVとして保存できます。"
```

## 3. 目的

CSV内で、利用者が選択した1つ以上の列を重複判定キーとして使用し、
同一キーを持つ複数行のうち**最初の1行だけを残し、2件目以降を削除**する。

処理結果は元CSVを変更せず、新しいCSVとしてDownloadする。

代表ユースケース:

- ID列の重複を除去したい
- メールアドレス列の重複を除去したい
- 「社員番号 + 日付」の組み合わせで重複を除去したい
- Excel等から出力したCSVを、最初の出現を残して整理したい

## 4. 非スコープ

以下は実装しない。

- 「最後の行を残す」切替
- 重複行の手動選択
- fuzzy match
- 大文字小文字を無視する設定
- trimして比較する設定
- Unicode normalization
- 全角半角変換
- 数値化
- 日付解釈
- 行ソート
- CSV内容の編集
- 複数ファイル一括処理
- Shift_JIS / CP932対応
- サーバー処理
- 外部API
- AI API

必要性が確認された場合は将来の別拡張とする。

## 5. 入力

### 5.1 CSVファイル

1ファイルのみ選択。

既存CSV Toolと同じ仕様を使用する。

- UTF-8
- UTF-8 BOM付き可
- カンマ区切り
- ヘッダー必須
- quoted comma対応
- escaped quote対応
- multiline field対応
- Shift_JIS / CP932非対応

CSV parse / validate / serializeは既存共通資産を再利用する。

### 5.2 重複判定キー

CSV読込後、ヘッダー列をcheckbox一覧で表示する。

利用者は1つ以上選択する。

複数列を選択した場合は、**選択した全列の値の組み合わせが完全一致したときだけ重複**とする。

## 6. 重複判定仕様

### 6.1 基本

データ行を上から順番に処理する。

選択されたキー列の値の組み合わせについて:

- 初回出現 → 残す
- 2回目以降 → 削除対象

例:

```text
ID,NAME
001,田中
002,鈴木
001,佐藤
003,山田
001,高橋
```

キー=`ID` の場合、出力:

```text
ID,NAME
001,田中
002,鈴木
003,山田
```

削除される行:

```text
001,佐藤
001,高橋
```

### 6.2 完全一致

既存Tool #003と同じ意味論を使用する。

以下はすべて区別する。

- `ABC` と `abc`
- `A` と ` A`
- `001` と `1`
- 空欄と空白文字
- Unicode上で異なる文字列

暗黙変換を一切行わない。

### 6.3 空欄

空欄も通常のキー値として扱う。

### 6.4 行順

残る行の相対順序を変更しない。

### 6.5 元データ

入力recordsをmutationしない。

## 7. 既存ロジック再利用

Tool #003の以下を必ず確認する。

- `shared/csv-duplicate-core.js`
- `shared/csv-duplicate-app.js`
- `tests/csv-duplicate.test.mjs`

重複キー生成・選択列の意味論を別実装で複製しないこと。

推奨方針:

- 重複判定に共通化可能な純粋helperが必要なら `shared/csv-duplicate-core.js` に抽出・追加する
- Tool #003の既存公開挙動を変更しない
- Tool #007固有の「最初を残して2件目以降を除去する」処理は `shared/csv-remove-duplicates-core.js` に置く

より単純で重複のない設計がある場合はLunaが判断してよい。
その場合は最終報告で設計判断を説明する。

## 8. core出力

Tool固有coreは、最低限以下に相当する情報を返せる構造にする。

```text
headers
records
dataRows
originalDataRowCount
remainingDataRowCount
removedDataRowCount
duplicateGroupCount
```

意味:

- `records`: ヘッダー + 重複除去後データ
- `originalDataRowCount`: 元のデータ行数
- `remainingDataRowCount`: 出力データ行数
- `removedDataRowCount`: 2件目以降として削除された行数
- `duplicateGroupCount`: 2件以上存在したキーの種類数

必要に応じて追加情報を返してよいが、UI都合のDOM情報をcoreへ入れない。

## 9. UI

既存CSV Toolの視覚言語を使用する。

基本フロー:

1. CSVファイル選択
2. ファイル概要表示
3. 重複判定キー選択
4. 「重複行を削除」ボタン
5. 処理結果概要
6. Preview
7. 「CSVを保存」

### ファイル概要

- ファイル名
- ファイルサイズ
- 列数
- データ行数

### 結果概要

- 元のデータ行数
- 選択したキー列
- 重複グループ数
- 削除した行数
- 残った行数

### Preview

重複除去後のCSVを表形式Previewする。
巨大CSVを全件DOM表示せず、先頭20行程度を上限とする。
Downloadには全件を含める。

### 重複0件

正常処理として扱う。

表示例:

`重複行は見つかりませんでした。元の内容のまま保存できます。`

保存ボタンは利用可能としてよい。

## 10. Download

- UTF-8 BOM付き
- CRLF
- 元の列順を維持
- 元の値を維持
- 元CSVを上書きしない

ファイル名:

```text
<元ファイル名>-duplicates-removed.csv
```

既存の `outputFilename` 規則に合わせて実装する。

## 11. エラー条件

最低限以下で処理を停止し、利用者向けメッセージを表示する。

- ファイル未選択
- UTF-8として読めない
- CSV構文エラー
- ヘッダーなし
- 列数不整合
- キー列0件

既存共通CSVエラー処理を再利用する。
曖昧なCSVを自動修復しない。

## 12. ページコンテンツ

Factory標準に従い、H1、lead、privacy note、使い方、入力例、仕様・制限、FAQ、関連Toolを含める。

### H1

`CSV重複行削除`

### lead

`指定した列をキーにして、同じ値を持つ2件目以降の行を削除し、新しいCSVとして保存できます。`

### Privacy note

既存CSV Toolと同じ。

### FAQ

最低限:

1. ファイルはアップロードされますか？
2. どの行が残りますか？
3. 複数列を組み合わせられますか？
4. 空欄はどう扱いますか？
5. 大文字小文字や空白はどう扱いますか？
6. 元CSVは変更されますか？

### 関連Tool

- CSV重複チェック
- CSV列抽出・列削除
- CSV空欄行削除

## 13. SEO

- title: `CSV重複行削除 | 仕事データツール`
- canonical: `https://tools.norqevia.com/csv/remove-duplicates/`
- OGP URL: canonicalと同じ
- H1: `CSV重複行削除`

meta descriptionは「指定列」「重複」「削除」「CSV保存」「ブラウザ内処理」が自然に伝わる文章にする。

## 14. Unit Test

最低限以下を検証する。

1. 重複なし
2. 1列キーで2件重複
3. 同一キー3件以上
4. 複数重複グループ
5. 複数列キー
6. 空欄キー
7. 日本語
8. Unicode
9. quoted comma
10. escaped quote
11. multiline field
12. 大文字小文字を区別
13. 前後空白を区別
14. `001` と `1` を区別
15. 重複ヘッダーをindexで区別
16. 元データをmutationしない
17. 行順を維持
18. キー列0件でerror
19. Download用serialize結果
20. 50,000行程度で実用時間内

## 15. Browser Test

最低限1本の主要シナリオとスマートフォンoverflowを追加する。

主要シナリオ:

1. `/csv/remove-duplicates/` を開く
2. UTF-8 BOM付きCSVを選択
3. キー列を選択
4. 重複削除実行
5. 元行数・削除行数・残行数確認
6. Previewで最初の行が残り2件目以降が消えていることを確認
7. CSV Download
8. Download filename確認
9. Offlineへ切替
10. 別CSVで再実行
11. 正常動作
12. Tool入力データ由来の外部通信なし
13. Console Errorなし

スマートフォン:

- viewport 390x844
- ファイル選択と主要操作が見える
- `body.scrollWidth <= window.innerWidth`

## 16. Network / Privacy

Tool入力データ・処理結果を外部送信しない。
Tool #007の実装自体に fetch / XHR / WebSocket / EventSource / Beacon / 外部script / 外部API を追加しない。

## 17. Human Gate

`docs/HUMAN_GATE.md` に Tool #007 を追加する。

- [ ] 実際の業務系CSVでキー列を選び、2件目以降の重複だけが削除される
- [ ] 複数列キーの意味が直感的に理解できる
- [ ] 削除件数・残件数・Previewが理解しやすい
- [ ] 保存したCSVをExcel等で開き、日本語・先頭ゼロ・引用符付き値・行順が保持されている
- [ ] 日本語表現・画面構成に違和感がない

## 18. Factory v2実地検証

Tool #007はPhase A Factoryの実地検証でもある。

- Scaffoldが期待4ファイルを生成したか
- `tools.json` がdraftになったか
- Scaffold markerが機能したか
- draft状態でbuild成果物にTool pageが入らないか
- test discoveryが自動で新unit testを拾ったか
- Tool固有実装後にmarkerをすべて除去できたか
- Human Gate前に勝手にpublishedへ変更していないか

Factory自体に一般的問題を発見した場合は、Tool #007側で迂回せずFactory側を修正し、regression testを追加する。

## 19. 実装完了時のstatus

自動テスト完了後も:

```json
"status": "draft"
```

のままにする。

Human Gate完了後の公開判断は人間が行う。

## 20. 完成定義

- [ ] Factory ScaffoldからTool #007を生成した
- [ ] Tool固有UI完成
- [ ] core完成
- [ ] app完成
- [ ] Scaffold marker全除去
- [ ] 既存CSV共通資産を再利用
- [ ] #003と重複判定意味論が一致
- [ ] Unit Test追加
- [ ] Browser Test追加
- [ ] Network Isolation通過
- [ ] build通過
- [ ] 全既存Unit Test通過
- [ ] 全Browser Test通過
- [ ] `docs/HUMAN_GATE.md`更新
- [ ] 必要なREADME / Factory文書だけ更新
- [ ] `tools.json` はTool #007を `draft` で保持
- [ ] 既存6 Toolにregressionなし
- [ ] 実装結果・テスト結果・Factoryで発見した改善点を報告

Human Gate完了・published化・pushはこの実装依頼の範囲外とする。

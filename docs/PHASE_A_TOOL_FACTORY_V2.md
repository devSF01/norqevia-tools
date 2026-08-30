# Phase A: Tool Factory v2 実装仕様

## 1. 目的

`norqevia-tools` に新しいToolを追加するときの定型作業を自動化し、今後のTool増産コストと実装ばらつきを下げる。

Phase Aの完成後は、新規Tool追加を次の流れにする。

1. Toolの企画・固有仕様を決める
2. Scaffoldコマンドで定型ファイルとRegistryのdraftエントリを生成する
3. Codex/LunaがTool固有ロジック・UI文言・テストを実装する
4. 自動テストを通す
5. `docs/HUMAN_GATE.md` に従って人間が確認する
6. `tools.json` のstatusを `published` に変更する
7. buildで公開成果物へ反映する

Phase Aは「Toolを自動完成させる仕組み」ではない。
**定型構造を安全・再現可能に生成し、Tool固有実装だけをAIへ委任できる状態**を作ることが目的である。

## 2. 現状の前提

実装前に以下をSource of Truthとして読むこと。

- `AGENTS.md`
- `docs/TOOL_FACTORY.md`
- `docs/HUMAN_GATE.md`
- `tools.json`
- `scripts/build.mjs`
- `tests/registry.test.mjs`
- `tests/browser.test.mjs`
- 既存の同カテゴリTool
- `shared/` の既存共通資産

現在の主要構造:

- `tools.json`
  - Tool公開情報のSource of Truth
  - `status: "published"` のToolだけがトップページとsitemapへ載る
- `scripts/build.mjs`
  - `dist/` を生成する
- `shared/`
  - DOM非依存coreと画面制御appを置く
- `tests/`
  - Unit / Registry / Serve / Network Isolation / Browser Test
- `docs/HUMAN_GATE.md`
  - 実装後の人手確認

既存Toolは概ね以下の責務分離を採用している。

- `<category>/<slug>/index.html`
- `shared/<tool-id>-core.js`
- `shared/<tool-id>-app.js`
- `tests/<tool-id>.test.mjs`

## 3. Phase Aのスコープ

### 3.1 必須

1. 新規Tool Scaffold CLI
2. Scaffold用テンプレート
3. `tools.json` へのdraft登録
4. draft Toolを `dist/` に出さないbuild制御
5. Tool追加時にテスト一覧を手作業更新しなくてよい仕組み
6. Scaffold自体の自動テスト
7. `docs/TOOL_FACTORY.md` / READMEの運用手順更新
8. 既存Tool・既存公開URLを壊さないこと

### 3.2 非スコープ

- Tool #007以降の実機能
- Tool固有ロジックの自動生成
- SEOキーワード自動調査
- Search Console連携
- Cloudflare Analytics連携
- AdSense / 広告表示
- Affiliate / Sponsor
- 自動publish
- Git commit / push自動化
- Human Gateの自動省略
- AI API / 外部API
- 新しいRuntime依存
- フレームワーク導入

## 4. Scaffold CLI

### 4.1 エントリポイント

以下を追加する。

- `scripts/create-tool.mjs`
- 必要なら責務分離用に `scripts/create-tool-core.mjs` 等を追加してよい
- `package.json` に `create-tool` scriptを追加する

想定実行:

```text
pnpm run create-tool -- --id csv-dedupe --number 7 --name "CSV重複行削除" --category "CSV" --template csv --slug dedupe --description "CSVから重複する行を確認し、新しいCSVとして保存できます。"
```

Node標準機能だけで実装する。新規npm依存は追加しない。

### 4.2 必須引数

| 引数 | 意味 | 例 |
| --- | --- | --- |
| `--id` | Toolの一意ID | `csv-dedupe` |
| `--number` | Tool番号 | `7` |
| `--name` | 表示名 | `CSV重複行削除` |
| `--category` | 表示カテゴリ | `CSV` |
| `--template` | Scaffold種別 | `csv` / `text` |
| `--slug` | URL末尾・ディレクトリ名 | `dedupe` |
| `--description` | Registry用説明 | `...できます。` |

Phase Aでサポートする `template` は `csv` と `text` のみとする。
将来テンプレート種別を追加可能な構造にはしてよいが、未要求の種別は実装しない。

### 4.3 自動導出

`template=csv`, `slug=dedupe` の場合:

- URL path: `/csv/dedupe/`
- page path: `csv/dedupe/index.html`

`template=text`, `slug=dedupe-lines` の場合:

- URL path: `/text/dedupe-lines/`
- page path: `text/dedupe-lines/index.html`

shared/testファイル名は `id` を使用する。

- `shared/<id>-core.js`
- `shared/<id>-app.js`
- `tests/<id>.test.mjs`

## 5. Scaffold生成物

### 5.1 Tool page

`<template>/<slug>/index.html`

最低限以下を含むdraftページを生成する。

1. 共通header
2. breadcrumb
3. H1 = `name`
4. lead = `description`
5. `privacy-note`
6. `tool-shell`
7. 使い方
8. 入力例または利用例
9. 仕様・制限
10. FAQ
11. 関連Tool
12. 共通footer
13. canonical / OGP / meta description
14. `shared/<id>-app.js` のmodule script

Tool固有UI・文言を勝手に完成させない。
draftページには、実装者が見落とさない形でTool固有編集箇所を残す。
CSVテンプレートでは既存CSV Toolの共通CSS・視覚言語を再利用し、Textテンプレートでは既存Text Toolの視覚言語を再利用する。

### 5.2 core

`shared/<id>-core.js`

- DOM非依存
- ES Module
- Tool固有ロジック用の最小雛形
- 既存共通coreを複製しない
- CSV Toolでは既存共通CSV処理を再利用する前提を明確にする
- 完成していないToolロジックを「動くふり」にしない

### 5.3 app

`shared/<id>-app.js`

- DOM/event handling専用
- coreと責務分離
- draft状態で実処理を偽装しない
- 既存Toolの実装慣習に合わせる
- Tool固有UIは後続実装で埋める

### 5.4 unit test

`tests/<id>.test.mjs`

- Node test runnerを使用
- 未実装なのに成功するダミーテストを作らない
- `test.todo` 等を使う場合、Toolを `published` にできないことを別の検証で保証する
- 未実装Toolを誤って公開できないことを最優先する

## 6. tools.json 登録

Scaffold実行時に `tools.json` へ以下を追加する。

```json
{
  "id": "csv-dedupe",
  "number": 7,
  "name": "CSV重複行削除",
  "category": "CSV",
  "path": "/csv/dedupe/",
  "description": "CSVから重複する行を確認し、新しいCSVとして保存できます。",
  "status": "draft"
}
```

Scaffoldは **必ず `status: "draft"` で作成する**。
Phase AではCLIから直接 `published` にするオプションを作らない。
公開はTool固有実装・自動テスト・Human Gate完了後の別操作とする。

## 7. Fail-closed要件

Scaffoldは、以下の場合にWorkspaceを変更せず終了する。

- `id` が空
- `id` が `^[a-z0-9]+(?:-[a-z0-9]+)*$` に一致しない
- `number` が正の整数でない
- `number` が既存Toolと重複
- `id` が既存Toolと重複
- 導出pathが既存Toolと重複
- `slug` が不正
- `template` が `csv` / `text` 以外
- 生成先Tool directoryが既に存在
- 生成予定shared coreが既に存在
- 生成予定shared appが既に存在
- 生成予定testが既に存在
- `tools.json` がparseできない
- 必須テンプレートが欠落
- 既存ファイルを上書きする可能性がある

検証は可能な限り**すべてmutation前に完了**する。
既存Toolを上書きする `--force` はPhase Aでは実装しない。

## 8. draft Toolをdistへ出さない

### 8.1 現状の問題

現在のbuildは `text/` と `csv/` をディレクトリ単位で `dist/` へコピーするため、
`tools.json` がdraftでも、source directoryを作成した時点でURL自体は `dist/` に入る。

### 8.2 完成条件

`status !== "published"` のToolは:

- トップページに載らない
- sitemapに載らない
- **Tool directory自体も `dist/` に存在しない**

`status === "published"` のToolだけを、`tools.json.path` を基準に `dist/` へコピーする。

共通資産:

- `index.html`
- `assets/`
- `shared/`
- `privacy/`
- `terms/`

は従来どおりbuild対象。

`text/` / `csv/` 全体を無条件コピーしない。

### 8.3 安全条件

- path traversalを許可しない
- `tools.json.path` はサイト内絶対pathとして検証する
- `..`, backslash, protocol等を含む不正pathはbuildを失敗させる
- published Toolのsource directoryが存在しない場合はbuildを失敗させる
- draft Toolのsourceが存在してもbuildは成功し、distには出さない

## 9. Test discovery自動化

### 9.1 現状の問題

`package.json` の `test` scriptが個別testファイルを列挙しているため、
Tool追加のたびに手作業更新が必要。

### 9.2 完成条件

`tests/*.test.mjs` を自動的に対象にする。

Windowsを含む現在の開発環境で確実に動く方法を採用する。

- 新しい `tests/<id>.test.mjs` を追加しても `package.json` の列挙修正が不要
- 既存テストがすべて実行される
- test順序に依存しない
- Node標準機能だけで実装
- `pnpm run test` のインターフェースは維持

必要なら `scripts/run-tests.mjs` 等を追加してよい。

## 10. Scaffold template設計

テンプレート本体を `scripts/create-tool.mjs` の巨大文字列へ埋め込まない。

推奨:

```text
templates/
  tool/
    csv/
      index.html.tpl
      core.js.tpl
      app.js.tpl
      test.mjs.tpl
    text/
      index.html.tpl
      core.js.tpl
      app.js.tpl
      test.mjs.tpl
```

または共通テンプレート＋template別差分でもよい。

重要条件:

- テンプレートが人間に読める
- placeholderが明示的
- HTML escapingが必要な値は必ずescape
- JavaScript文字列へ埋め込む値は適切にescape
- ユーザー入力を生のままHTML/JSへ挿入しない
- 既存Toolと視覚言語を揃える
- templateとgeneratorの責務を混ぜすぎない

## 11. Placeholder / publish safety

Scaffold直後は未完成であることを前提にする。

推奨方式として、Scaffold生成ファイルに機械検出可能なmarkerを入れる。

例:

```text
TOOL_SCAFFOLD_TODO
```

Factory testで以下を検証する。

- `status: "published"` のTool directory / core / app / testに `TOOL_SCAFFOLD_TODO` が残っていたらfail
- draft Toolではmarkerを許容
- published Toolにはmarkerを一切許容しない

これにより「statusだけpublishedへ変えた未完成Tool」が公開されるのを防ぐ。

## 12. Scaffoldの自動テスト

### 正常系

1. 有効なCSV Tool specから期待4ファイルを生成できる
2. 有効なText Tool specから期待4ファイルを生成できる
3. `tools.json` にdraftエントリが1件追加される
4. pathが期待どおり導出される
5. 生成HTMLにname / description / canonical / app moduleが反映される
6. 既存registry内容を壊さない

### 異常系

7. duplicate idを拒否
8. duplicate numberを拒否
9. duplicate pathを拒否
10. 既存directoryへの上書きを拒否
11. 不正idを拒否
12. 不正slugを拒否
13. 不正templateを拒否
14. 壊れたtools.jsonでfail
15. validation failure時にファイルを生成しない

### build / publish safety

16. draft Toolはdistへコピーされない
17. draft Toolはtop/sitemapへ出ない
18. published Toolは従来どおりdist/top/sitemapへ出る
19. published Toolにscaffold markerが残っていればtest/buildのどちらかでfail
20. published Toolのsource directory欠落時にbuild fail

### regression

21. 既存6 ToolのURL・build結果を維持
22. 既存Unit Test全通過
23. Network Isolation Test全通過
24. Browser Test全通過

## 13. README / TOOL_FACTORY更新

### README.md

「新しいToolを追加するには」を、

1. Tool企画
2. Scaffold実行
3. Tool固有実装
4. test
5. Human Gate
6. publish

の流れへ更新する。
具体的なCLI例を1つ載せる。

### docs/TOOL_FACTORY.md

以下を追加する。

- 新Toolは原則Scaffoldから開始
- Scaffold生成物を手作業で一から複製しない
- draft → implementation → tests → Human Gate → published
- scaffold markerをpublishedへ残さない
- draft Toolはdistへ出ない
- 新しいtemplate種別は明示的にFactory拡張するときだけ追加

`docs/TOOL_FACTORY.md` を最終的な恒常運用のSource of Truthとする。
このPhase A仕様書は実装プロジェクトの仕様・受入条件として残す。

## 14. Human Gate

Phase A固有のHuman Gate項目を `docs/HUMAN_GATE.md` に追記する。

- [ ] Scaffold CLIの入力項目が理解しやすい
- [ ] 生成されたCSV Tool draftのファイル構成が既存Toolと自然に揃う
- [ ] 生成されたText Tool draftのファイル構成が既存Toolと自然に揃う
- [ ] draft Toolがローカルbuildのdistに出ない
- [ ] 既存6 Toolが従来どおり表示・操作できる
- [ ] README / TOOL_FACTORYの手順だけを読んで次のTool追加を開始できる
- [ ] 未完成Toolを誤ってpublishedへ変更した場合に自動検査が停止する

## 15. 実装順序

1. 現状確認
   - AGENTS / TOOL_FACTORY / HUMAN_GATE
   - `tools.json`
   - build
   - package scripts
   - registry tests
   - 既存CSV / Text Tool
   - shared共通資産
2. Scaffold core
   - 引数parse
   - validation
   - path導出
   - registry mutation plan
   - template rendering
3. CSV / Text template追加
4. preflight後のファイル生成とtools.json更新
5. buildのdraft分離
6. test discovery自動化
7. Scaffold / draft / build safety test追加
8. README / TOOL_FACTORY / HUMAN_GATE更新
9. 全regression test

仕様と実装が食い違う場合、独断で仕様を変えず、最小の整合案を選び、結果報告に明記する。

## 16. 実装判断の優先順位

1. 既存Toolを壊さない
2. 未完成Toolを公開しない
3. Tool入力データを外部送信しない
4. 既存共通資産を再利用する
5. 自動化してもHuman Gateを残す
6. 新規依存を増やさない
7. 実装を単純に保つ
8. 将来拡張性は必要最小限にする

「将来便利そう」という理由だけでPhase Aの非スコープ機能を追加しない。

## 17. 完成定義 (Definition of Done)

- [ ] `pnpm run create-tool -- ...` でCSV scaffoldを作成できる
- [ ] Text scaffoldも作成できる
- [ ] 生成物が `index.html / core.js / app.js / test.mjs` の責務分離になっている
- [ ] `tools.json` へdraft登録される
- [ ] duplicate / overwrite / invalid inputがfail-closed
- [ ] draft Toolはdistへ出ない
- [ ] published Toolだけがtop/sitemap/distへ出る
- [ ] 未完成marker付きToolをpublishedにできない
- [ ] testファイル追加時にpackage.jsonへの個別列挙が不要
- [ ] Scaffold自体の正常系・異常系testがある
- [ ] 既存6 Toolのregressionがない
- [ ] Network Isolation Testが通る
- [ ] Browser Testが通る
- [ ] README更新済み
- [ ] TOOL_FACTORY更新済み
- [ ] HUMAN_GATE更新済み
- [ ] Human Gate確認済み
- [ ] 実装結果に、変更ファイル・設計判断・テスト結果・残課題が記録されている

## 18. Phase A完了後の新Tool追加方法

Phase A完了後、新しいToolをLunaへ依頼するときは、毎回サイト共通仕様を長文で再説明しない。

新Tool固有仕様だけを書き、次を指示する。

```text
AGENTS.md と docs/TOOL_FACTORY.md を読み、
Tool Factory Scaffoldを使って新Toolをdraft作成してください。

Tool固有仕様:
- Tool名:
- Tool番号:
- category:
- template:
- slug:
- description:
- 目的:
- 入力:
- 出力:
- 処理仕様:
- エラー条件:
- Human Gateで特に確認したい点:

既存共通資産を優先して再利用し、
実装・自動テスト完了後もstatusはdraftのままにしてください。
公開判断は人間が行います。
```

これをPhase B以降の標準委任方式とする。

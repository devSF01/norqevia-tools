# Tool Factory Standard

## 1. 目的

この文書は、`norqevia-tools` に新しいToolを追加する際の共通標準です。

Tool #001〜#003で確立した実装・テスト・公開方式をSource of Truthとして固定し、今後のTool追加では共通要件を毎回依頼文へ再記述しないことを目的とします。

新しいToolの依頼では原則として、

- Tool名
- URL
- カテゴリ
- 目的
- Tool固有仕様

だけを指定し、本書に記載された共通事項は自動的に適用します。

既存Factoryで解決済みの事項をToolごとに再設計しないでください。

---

## 2. Factoryの基本原則

### 2.1 ブラウザ内完結

利用者がToolに入力・選択したデータ、およびToolが生成した処理結果はブラウザ内だけで処理します。

Toolの入力データ・処理結果について、原則として以下を禁止します。

- サーバーへの送信
- 外部APIへの送信
- AI APIへの送信
- DBへの保存
- 永続保存
- LocalStorage等への業務データ保存
- Analytics / Tracking / 広告サービスへの送信

サイト運営、利用状況の把握、サービス改善、広告表示などのために、Cookie、アクセス解析、広告サービスその他の第三者サービスを利用することがあります。この場合、ページ閲覧やブラウザ等に関する情報が外部へ送信されることは許容しますが、Toolに入力・選択したデータや処理結果を含めてはなりません。

外部サービスを導入する場合は、以下を満たしてください。

- 導入を明示的に決定する
- 通信先と目的を把握する
- Toolの入力データ・処理結果が送信されないことを確認する
- Privacyページの方針と矛盾しないことを確認する
- Network Isolation Testでは、承認済みの運用通信とToolデータの外部送信を区別して検証する

ログイン、アカウント機能、外部CDNなど、Factoryの基本構成を変える機能はTool固有仕様またはサイト共通方針で明示された場合だけ導入します。

---

### 2.2 元データを変更しない

入力されたテキストやファイルを勝手に変更・上書きしません。

変換Toolで成果物を出力する場合は、新しいファイルとしてDownloadします。

入力値を意味的に変更する処理は、Tool固有仕様で明示された場合だけ実装します。

特に以下の暗黙変換を避けます。

- 数値化
- 日付化
- scientific notation化
- trim
- 大文字小文字変換
- Unicode normalization
- 全角半角変換

---

### 2.3 意図しない補完をしない

Tool固有仕様にない高度機能を独断で追加しません。

曖昧な入力や壊れた構造を勝手に補正して処理を続けるより、安全に停止して利用者へ説明することを優先します。

---

### 2.4 Runtime依存を増やさない

本番サイトは原則として、

- HTML
- CSS
- Vanilla JavaScript
- ES Modules

だけで動作させます。

Runtime外部依存は持たせません。

開発・テスト用依存は、Factoryの品質保証に必要な場合だけ使用します。

現在のブラウザテストにはPlaywrightを使用しています。

---

## 3. 既存共通部品

新Tool実装前に既存コードを確認し、同じ責務のコードを複製しないでください。

現在の主な共通資産:

- `assets/site.css`
  - サイト共通スタイル
- `shared/list-compare-core.js`
  - Tool #001のDOM非依存ロジック
- `shared/csv-columns-core.js`
  - CSV parser / serializer / UTF-8処理を含むCSV共通資産
- `shared/csv-columns-app.js`
  - Tool #002画面制御
- `shared/csv-duplicate-core.js`
  - Tool #003重複判定ロジック
- `shared/csv-duplicate-app.js`
  - Tool #003画面制御
- `tools.json`
  - Tool Registry
  - Toolの公開情報に関するSource of Truth
- `scripts/build.mjs`
  - `dist/`生成
  - `tools.json` からトップページのToolカードとsitemapを生成
- `scripts/serve.mjs`
  - ローカル静的配信
- `tests/`
  - Unit / HTTP / Registry / Network Isolation / Browser Test
- `docs/HUMAN_GATE.md`
  - Human Gate記録

CSV系Toolでは、Tool #002で確立したCSV parser / serializer / UTF-8検証を優先的に再利用してください。

同じCSV parserをToolごとにコピーしないでください。

---

## 4. Toolページ標準

新Toolページは既存Toolと同じサイト構造・視覚言語を使用します。

原則として以下を持たせます。

1. 共通ヘッダー
2. パンくず
3. H1
4. 一行説明
5. ブラウザ内処理・外部送信なしの表示
6. Tool本体
7. 使い方
8. 入力例または利用例
9. 仕様・制限
10. FAQ
11. 関連Tool
12. 共通フッター

Tool固有の理由がない限り、サイト全体のUIを再設計しません。

---

## 5. SEO・公開情報標準

各Toolページには最低限以下を設定します。

- 固有の`title`
- `meta description`
- canonical
- OGP title
- OGP description
- OGP URL
- H1
- パンくず

canonicalのProduction origin:

`https://tools.norqevia.com`

新Toolの登録情報は `tools.json` に追加します。

公開するToolは `status` を `published` とします。

`status: "published"` のToolは、build時に以下へ自動反映します。

- トップページのTool一覧
- `sitemap.xml`

トップページのToolカードやsitemap URLをTool追加のたびに手作業で更新しないでください。

Registryの生成結果は `tests/registry.test.mjs` で確認します。

関連Toolについては各Toolページの文脈に依存するため、現時点ではTool固有実装として扱います。
- `tools.json` の `description` は依頼文をそのまま転記せず、
  利用者向けの自然な説明文として記述する。
- 既存Toolと文体を揃え、原則として「〜できます。」形式とする。

## 6. 実装構造

Tool固有の処理は可能な限りDOMから分離します。

基本構造:

    Tool page
        ↓
    DOM / event handling
        ↓
    pure core logic

DOM非依存のcore logicを優先し、Unit Testから直接検証できる構造にしてください。
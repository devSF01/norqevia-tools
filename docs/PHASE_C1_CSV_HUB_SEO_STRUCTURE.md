# Phase C1: CSVハブ・内部リンクSEO構造改善

作成日: 2026-09-02

## 1. 目的

現在公開済みの15 Toolのうち14 ToolがCSVカテゴリに属しているが、`/csv/` にカテゴリハブページが存在せず、サイト構造上はトップページから各Toolが横並びで直接ぶら下がっている。

Stage A SEO監査では、以下は良好であることを確認済み。

- `robots.txt` はクロールを許可している
- `sitemap.xml` に公開済み15 Toolが収録されている
- 各Toolに固有の `title` / `meta description` / `canonical` / `H1` がある
- 各Toolに使い方、仕様・制限、FAQ、関連Toolリンクがある
- トップページから15 Toolすべてに静的HTMLリンクがある
- 公開Toolのcanonical事故や明白なnoindex事故は見つかっていない

本Phaseでは、既存14 CSV Toolをカテゴリとして束ね、利用者と検索エンジンの双方にCSV Tool群の階層関係を明確にする。

## 2. スコープ

実装対象:

1. `/csv/` ハブページを新設
2. 全CSV Toolのパンくずを `ホーム / CSVツール / 現在のTool` に変更
3. 共通ヘッダーに `CSVツール` リンクを追加
4. `/csv/` を sitemap に追加
5. トップページのCSV Tool群をカテゴリとして理解しやすくする最小限の整理
6. 今後CSV Toolを追加した際に、この構造が手作業で崩れにくいようFactory/build側を必要最小限修正
7. 自動テスト追加・更新
8. Human Gate追記

対象外:

- Tool #001〜#015 の処理ロジック変更
- Tool名・URL変更
- 大規模なtitle/meta description書き換え
- Search ConsoleのIndex判定
- 広告実装
- FAQ rich result目的の構造化データ
- 新しいTool #016以降の追加
- 公開、commit、push

## 3. Source of Truth

共通ルールは以下を優先する。

- `AGENTS.md`
- `docs/TOOL_FACTORY.md`
- `docs/HUMAN_GATE.md`
- `docs/PUBLISH_PROCEDURE.md`

本仕様書はPhase C1固有の差分を定義する。

## 4. 現状認識

公開構造は概ね以下。

```text
/
├ text/list-compare/
├ csv/columns/
├ csv/duplicate-check/
├ ...
└ csv/to-json/
```

一方、実際のコンテンツ体系は以下。

```text
/
├ テキスト
│  └ text/list-compare/
└ CSV
   ├ csv/columns/
   ├ csv/duplicate-check/
   ├ ...
   └ csv/to-json/
```

`csv/index.html` は現状存在しない。

Phase C1後は以下を目標とする。

```text
/
├ /text/list-compare/
└ /csv/
   ├ /csv/columns/
   ├ /csv/duplicate-check/
   ├ /csv/remove-empty-rows/
   ├ /csv/merge/
   ├ /csv/split/
   ├ /csv/remove-duplicates/
   ├ /csv/header-compare/
   ├ /csv/sort/
   ├ /csv/empty-cell-check/
   ├ /csv/row-column-count/
   ├ /csv/row-filter/
   ├ /csv/rename-columns/
   ├ /csv/to-tsv/
   └ /csv/to-json/
```

## 5. `/csv/` ハブページ

### 5.1 URL

`https://tools.norqevia.com/csv/`

### 5.2 基本SEO

以下を持つこと。

- `<html lang="ja">`
- 固有 `title`
- 固有 `meta description`
- self canonical: `https://tools.norqevia.com/csv/`
- OGP title / description / type / url
- H1
- 静的HTMLとして各CSV Toolへのリンク

推奨タイトル:

`CSVツール一覧 | 仕事データツール`

推奨H1:

`CSVツール一覧`

descriptionは、以下の意味を自然な日本語で含める。

- CSVの確認・整理・加工・変換ができる
- ブラウザ内処理
- 入力ファイルを外部送信しない

過度なキーワード列挙はしない。

### 5.3 ページ内容

単なる14リンクの平坦な一覧にせず、用途別に分類する。

#### 確認する

- CSV行数・列数カウント
- CSV重複チェック
- CSV空欄セルチェック
- CSVヘッダー比較

#### 整理する

- CSV列抽出・列削除
- CSV並べ替え
- CSV行フィルター
- CSV列名変更

#### 修正する

- CSV重複行削除
- CSV空欄行削除

#### まとめる・分ける

- CSV結合
- CSV分割

#### 変換する

- CSV→TSV変換
- CSV→JSON変換

分類はUI上で分かりやすい見出しにする。

各Toolリンクには、既存 `tools.json` の name / description を可能な限り再利用する。SEO用に別の説明文データを大量に二重管理しない。

### 5.4 ハブ本文

短い導入文を置く。

意図:

- CSV作業用Toolを用途別に選べる
- すべてブラウザ内処理
- CSVファイルはサーバーへ送信・保存しない
- 各Toolは用途ごとに独立している

長文SEO記事にはしない。

### 5.5 関連導線

ハブからトップへ戻れること。

プライバシー、利用規約への既存共通導線を維持する。

## 6. 共通ヘッダー

現在の主要ナビゲーション:

- プライバシー
- 利用規約

Phase C1後:

- CSVツール
- プライバシー
- 利用規約

`CSVツール` は `/csv/` への通常の `<a href>` とする。

トップ、CSVハブ、全Tool、privacy、termsなど、共通ヘッダーを持つ公開ページで自然に揃えること。

ただし既存サイトの見た目を大きく変更しない。

## 7. パンくず

### 7.1 CSV Tool

現在:

```text
ホーム / CSV→JSON変換
```

変更後:

```text
ホーム / CSVツール / CSV→JSON変換
```

- `ホーム` → `/`
- `CSVツール` → `/csv/`
- 現在ページは `aria-current="page"` を維持
- 全14 CSV Toolに適用

### 7.2 CSVハブ

```text
ホーム / CSVツール
```

### 7.3 非CSV Tool

`/text/list-compare/` は無理にCSV階層へ入れない。

既存構造を維持する。

## 8. トップページ

トップページから15 Toolすべてへのリンクは維持する。

CSVハブ追加によって個別Toolへの直接リンクを消さない。

ただし、現在14枚のCSVカードが平坦に並んでいるため、以下のどちらかの最小変更を行ってよい。

推奨:

- CSV Tool群の直前に `CSVツール` セクション見出し
- `/csv/` への `CSVツールを一覧で見る` リンク

Text Toolは別カテゴリとして理解できる構造にする。

重要:

- トップ → 各Toolの直接リンクは維持
- トップ → `/csv/` のリンクも追加
- 大規模なトップ再設計は行わない

### 8.1 CSV結合説明文

現在トップのCSV結合説明:

`複数のCSVを1つのCSVに結合するTool。`

他Toolと文体を合わせるため、`tools.json` 側のdescriptionを以下へ変更してよい。

`複数のCSVを順番に結合し、1つのCSVとして保存できます。`

Tool本体の意味は変えない。

## 9. sitemap

`/csv/` を公開URLとして追加する。

期待順序の例:

```text
/
 /csv/
 /text/list-compare/
 /csv/columns/
 ...
```

正確な順序はbuild設計に合わせてよいが、以下を満たすこと。

- `/csv/` が1回だけ含まれる
- 公開15 Toolが引き続き含まれる
- privacy / termsが引き続き含まれる
- draft Toolは含まれない
- 重複URLなし

## 10. robots / canonical

`robots.txt` の既存方針は変更不要。

`/csv/` のcanonicalは必ずself canonical。

既存Toolのcanonicalは変更しない。

## 11. Factory / Build設計

このPhaseの重要要件。

CSV Toolが今後 #016以降増えたとき、以下が手作業更新だけに依存しないこと。

- `/csv/` ハブのTool一覧
- トップのTool一覧
- sitemap
- draft/published隔離

既存 `tools.json` / registry / buildの責務を確認し、自然であれば `/csv/` ハブも同じ公開registryから生成する。

### 11.1 禁止

- CSV Tool名・説明文を `/csv/index.html` に14件手書き複製し、`tools.json` と二重管理する
- draft Toolをハブに表示する
- 新Tool追加ごとに複数ページのHTMLを手作業編集する仕組みに戻す
- SEO対応を理由にFactory全体を大規模rewriteする

### 11.2 分類データ

用途分類に追加データが必要な場合は、責務を明確にする。

許容例:

- registry/tool metadataに小さいcategory group metadataを追加
- build側にCSV Tool ID→表示グループの小さな明示map

ただしToolのruntime logicへSEO分類情報を持ち込まない。

将来の拡張性より、現在の単純さを優先する。

## 12. 既存Toolページ

処理UI、core/app、ファイル入出力仕様は変更しない。

変更対象は原則:

- 共通header
- breadcrumb
- 必要なら関連導線

各Tool固有本文、FAQ、仕様・制限は現状維持。

検索Query実績がない段階でtitle/descriptionの大規模最適化を行わない。

## 13. 構造化データ

Phase C1では必須ではない。

BreadcrumbList JSON-LDを導入する場合は、以下を満たす場合のみ許可。

- HTMLパンくずと完全一致
- 全対象ページで一貫
- build/templateから安全に生成
- 大きな複雑化を生まない

導入しなくてもPhase C1完了条件を満たす。

FAQPage構造化データは導入しない。

## 14. テスト

既存テストを壊さず、以下を自動確認する。

### 14.1 Registry / build

- published CSV Toolだけが `/csv/` ハブに表示される
- draft CSV Toolは表示されない
- `/csv/` がdistへ生成される
- `/csv/` がsitemapに1回だけ入る
- 既存15 Toolはsitemapから消えない
- draft isolationを維持
- build失敗時に不完全distへ更新しない既存方針を維持

### 14.2 HTML

`/csv/` について:

- title
- meta description
- canonical
- H1
- 14 CSV Toolリンク
- 14 Toolの重複なし
- Text Tool #001がCSV一覧に混ざらない
- privacy/terms導線
- トップへの導線

既存CSV Toolについて代表または生成ルールで:

- breadcrumbに `/csv/` リンクがある
- self canonical維持
- H1維持
- Toolのapp script維持

### 14.3 Browser

- `/csv/` が正常表示
- 各カテゴリ見出しが表示
- 代表Toolへ遷移できる
- トップ → `/csv/` へ遷移できる
- CSV Tool → `/csv/` へ遷移できる
- Offlineでも静的ナビゲーションが機能
- 外部通信なし
- Console Error / pageerrorなし
- 390x844でbody horizontal overflowなし

既存全Tool browser/unit regressionを通す。

## 15. Human Gate

`docs/HUMAN_GATE.md` にPhase C1セクションを追加する。

人間確認は5項目程度に限定。

推奨:

- [ ] `/csv/` の用途別分類が直感的で、目的のToolを探しやすい
- [ ] トップ→CSV一覧→個別Toolの導線が自然
- [ ] CSV ToolのパンくずからCSV一覧へ戻りやすい
- [ ] PC/スマートフォンでナビゲーションと一覧表示に違和感がない
- [ ] Toolの処理UIや既存文言に意図しない変化がない

自動確認済み事項は別記する。

## 16. 完了条件

以下をすべて満たすこと。

1. `/csv/` が存在する
2. `/csv/` にpublishedの14 CSV Toolが用途別表示される
3. draft Toolは表示されない
4. 全14 CSV Toolのパンくずに `/csv/` が入る
5. 共通headerから `/csv/` へ移動できる
6. トップから `/csv/` へ移動できる
7. トップから各Toolへの直接リンクも維持
8. `/csv/` がsitemapに入る
9. canonical / title / H1の既存SEO要素を壊さない
10. #001〜#015のTool処理挙動を変えない
11. 今後のCSV Tool追加時にregistry/buildからハブへ反映できる
12. Human Gateが更新される
13. Unit / registry / build / browser / network isolation regressionが通る
14. public statusやTool内容を勝手に変更しない
15. commit / push / publishしない

## 17. Luna完了報告に含める内容

1. 変更ファイル一覧
2. `/csv/` の生成方式
3. CSV Tool用途分類のデータ保持場所
4. トップページ変更内容
5. 共通header変更内容
6. breadcrumb変更方式
7. sitemap変更方式
8. draft isolationの確認方法
9. canonical/title/H1維持の確認
10. CSV結合descriptionを変更したか
11. 追加・更新テスト
12. 実行したコマンドと結果
13. Human Gate変更内容
14. 既存Toolの回帰結果
15. 未解決事項・判断が必要な事項

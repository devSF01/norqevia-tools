# 仕事データツール

CSVやテキストの確認・変換・比較を、入力データを外部へ送らずブラウザ内だけで行う静的ツール集です。最初のツールは「2つのリスト突合」です。

## 技術構成

本番サイトはHTML、CSS、Vanilla JavaScript（ES Modules）のみで、実行時依存を持ちません。開発時だけ、動的通信・Offline・ダウンロードを検証するためのPlaywrightを開発依存として使います。Cloudflare Pagesを含む静的ホスティングへ `dist/` を配置できます。比較ロジックはDOMから分離した `shared/list-compare-core.js` に置き、後続ツールのテストと実装を単純にします。

## 起動・ビルド・テスト

Bundled Node.js を利用する環境では、次のように実行します。

```text
pnpm run build
pnpm run serve
pnpm run test
pnpm run test:network
```

`pnpm run test:all` はビルド、単体テスト、通信禁止の静的検査をまとめて実行します。`serve` の後は `http://localhost:4173/text/list-compare/` を開きます。

## Network Isolation Test

`tests/network-isolation.mjs` は `fetch`、XHR、WebSocket、EventSource、Beacon、iframe、外部 script / stylesheet、外部URLを検査します。ブラウザ確認では初回読込後にOfflineへ切り替え、入力・比較・結果・TXT保存を確認します。

## 構成

```text
assets/                 共通スタイル
shared/                 DOM非依存の処理ロジックと画面制御
text/list-compare/      Tool #001 の静的ページ
privacy/ , terms/       共通ページ
tests/                  単体・通信禁止テスト
docs/HUMAN_GATE.md      人手確認と自動化候補の記録
scripts/                静的ビルドとローカル配信
dist/                   配置用成果物（buildで生成）
```

## 新しいToolを追加するには

1. 目的別のURLディレクトリ（例: `text/new-tool/index.html`）を作成し、共通ヘッダー、パンくず、ローカル処理表示、説明、FAQ、関連ツールを配置します。
2. 変換/比較の純粋ロジックを `shared/` に追加し、DOM処理から分離します。
3. `tests/` に仕様単位のテスト、`tests/network-isolation.mjs` の対象外となる通信がないことを確認します。
4. トップのツールカードと `scripts/build.mjs` のsitemap URLを更新します。
5. `pnpm run test:all`、Offline操作、Human Gateを実施します。

通常は「新ページ、純粋ロジック、単体テスト、トップとsitemapの更新」の4〜5ファイルから開始できます。共通UIを更新する場合のみ `assets/site.css` を更新します。

## Human Gate

自動テスト後、[Human Gate checklist](docs/HUMAN_GATE.md) を使って実機確認します。発見事項ごとに自動化可能性を記録してください。

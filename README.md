# 仕事データツール

CSVやテキストの確認・変換・比較を、入力データを外部へ送らずブラウザ内だけで行う静的ツール集です。「2つのリスト突合」「CSV列抽出・列削除」「CSV重複チェック」「CSV空欄行削除」を提供します。

## 技術構成

本番サイトはHTML、CSS、Vanilla JavaScript（ES Modules）のみで、実行時依存を持ちません。開発時だけ、動的通信・Offline・ダウンロードを検証するためのPlaywrightを開発依存として使います。Cloudflare Pagesを含む静的ホスティングへ `dist/` を配置できます。比較ロジックはDOMから分離した `shared/list-compare-core.js` に置き、後続ツールのテストと実装を単純にします。

Toolの公開情報は `tools.json` をSource of Truthとします。`scripts/build.mjs` は `status: "published"` のToolを番号順に読み取り、トップページのToolカードと `sitemap.xml` を自動生成します。

## 起動・ビルド・テスト

Bundled Node.js を利用する環境では、次のように実行します。

    pnpm run build
    pnpm run serve
    pnpm run test
    pnpm run test:network

`pnpm run test:all` はビルド、単体テスト、通信禁止の静的検査、ブラウザテストをまとめて実行します。`serve` の後は `http://localhost:4173/` を開きます。

## Network Isolation Test

`tests/network-isolation.mjs` は `fetch`、XHR、WebSocket、EventSource、Beacon、iframe、外部 script / stylesheet、外部URLを検査します。ブラウザ確認では初回読込後にOfflineへ切り替え、入力・比較・結果・TXT保存を確認します。

## 構成

    assets/                 共通スタイル
    shared/                 DOM非依存の処理ロジックと画面制御
    text/list-compare/      Tool #001 の静的ページ
    csv/columns/            Tool #002 の静的ページ
    csv/duplicate-check/    Tool #003 の静的ページ
    csv/remove-empty-rows/  Tool #004 の静的ページ
    privacy/ , terms/       共通ページ
    tests/                  単体・通信禁止テスト
    docs/HUMAN_GATE.md      人手確認と自動化候補の記録
    scripts/                静的ビルドとローカル配信
    tools.json              Tool Registry（公開情報のSource of Truth）
    dist/                   配置用成果物（buildで生成）

## 新しいToolを追加するには

1. 目的別のURLディレクトリ（例: `text/new-tool/index.html`）を作成し、共通ヘッダー、パンくず、ローカル処理表示、説明、FAQ、関連ツールを配置します。
2. 変換/比較の純粋ロジックを `shared/` に追加し、DOM処理から分離します。
3. `tests/` に仕様単位のテストを追加し、`tests/network-isolation.mjs` の対象外となる通信がないことを確認します。
4. `tools.json` にTool情報を登録します。公開する場合は `status` を `published` にします。
5. `pnpm run test:all`、Offline操作、Human Gateを実施します。

トップページのToolカードと `sitemap.xml` は `tools.json` からbuild時に生成されるため、新Tool追加時に個別更新しません。

Tool #002では、新ページ、純粋ロジック、画面制御、CSV専用スタイル、単体テスト、ブラウザテストの追加と、トップ・sitemap・build・Network Isolation・Human Gate・READMEの更新を行いました。

Tool #003では、Tool #002のCSV parser / serializer / UTF-8検証をそのまま再利用しました。ページ、重複判定ロジック、重複一覧UI、固有テストだけを新規に追加しています。

Tool #003後のFactory改善として `tools.json` をTool Registry化し、トップページのToolカードとsitemapをbuild時生成へ移行しました。`tests/registry.test.mjs` でpublished Toolの表示順、トップページ反映、sitemap反映、未公開Toolの除外を検証します。

Tool #004では、共通CSV parser / serializer / UTF-8検証を再利用し、全列が空のデータ行だけを削除して新しいCSVを保存します。削除件数、出力プレビュー、Download、Offline動作を確認します。

## Human Gate

自動テスト後、[Human Gate checklist](docs/HUMAN_GATE.md) を使って実機確認します。発見事項ごとに自動化可能性を記録してください。

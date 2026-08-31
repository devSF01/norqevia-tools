# 仕事データツール

CSVやテキストの確認・変換・比較を、入力データを外部へ送らずブラウザ内だけで行う静的ツール集です。「2つのリスト突合」「CSV列抽出・列削除」「CSV重複チェック」「CSV空欄行削除」「CSV結合」「CSV分割」「CSV重複行削除」を提供します。

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

`pnpm run test` は `tests/*.test.mjs` のNode test runner用ファイルを自動検出します。Playwright専用の `browser.test.mjs` は `pnpm run test:browser` で実行されるため、Tool追加時にNodeテストの列挙を手作業で更新する必要はありません。

## Network Isolation Test

`tests/network-isolation.mjs` は `fetch`、XHR、WebSocket、EventSource、Beacon、iframe、外部 script / stylesheet、外部URLを検査します。ブラウザ確認では初回読込後にOfflineへ切り替え、各Toolの主要操作・結果・保存が継続して動作することを確認します。

## 構成

    assets/                 共通スタイル
    shared/                 DOM非依存の処理ロジックと画面制御
    text/list-compare/      Tool #001 の静的ページ
    csv/columns/            Tool #002 の静的ページ
    csv/duplicate-check/    Tool #003 の静的ページ
    csv/remove-empty-rows/  Tool #004 の静的ページ
    csv/merge/              Tool #005 の静的ページ
    csv/split/              Tool #006 の静的ページ
    csv/remove-duplicates/  Tool #007 の静的ページ
    privacy/ , terms/       共通ページ
    tests/                  単体・通信禁止テスト
    docs/HUMAN_GATE.md      人手確認と自動化候補の記録
    scripts/                Scaffold、テスト実行、静的ビルド、ローカル配信
    templates/tool/         ScaffoldのCSV / Textテンプレート
    tools.json              Tool Registry（公開情報のSource of Truth）
    dist/                   配置用成果物（buildで生成）

## 新しいToolを追加するには

1. Toolの目的、入力、出力、処理仕様を決めます。
2. Scaffoldを実行します。Scaffoldは必ず `draft` として4ファイルとregistry entryを生成します。

       pnpm run create-tool -- --id csv-remove-duplicates --number 7 --name "CSV重複行削除" --category "CSV" --template csv --slug remove-duplicates --description "指定した列をキーにCSVの重複行を削除し、新しいCSVとして保存できます。"

3. 生成されたページ、`shared/<id>-core.js`、`shared/<id>-app.js`、`tests/<id>.test.mjs` にTool固有のUI・ロジック・説明・テストを実装します。CSV処理は既存の `shared/csv-columns-core.js` などを優先して再利用します。
4. `pnpm run test:all` と必要な個別テストを実施します。`tests/*.test.mjs` は自動検出されるため、`package.json` のテスト一覧を更新する必要はありません。
5. [Human Gate checklist](docs/HUMAN_GATE.md) に従って人間が実機確認します。
6. 実装・テスト・Human Gateが完了したToolだけ、`tools.json` の `status` を `published` に変更します。Scaffold markerが残るToolはbuildが停止します。

トップページのToolカードと `sitemap.xml` は `tools.json` からbuild時に生成されるため、新Tool追加時に個別更新しません。

## 公開手順

実装結果と自動検証結果を確認したうえで、ユーザーが対象Toolについて「公開してください」と明示した場合に限り、Human Gateの最終承認として公開へ進みます。status変更、公開用build、対象ファイルだけのcommit、通常pushの詳細は [`docs/PUBLISH_PROCEDURE.md`](docs/PUBLISH_PROCEDURE.md) を参照してください。

Tool #002では、新ページ、純粋ロジック、画面制御、CSV専用スタイル、単体テスト、ブラウザテストの追加と、トップ・sitemap・build・Network Isolation・Human Gate・READMEの更新を行いました。

Tool #003では、Tool #002のCSV parser / serializer / UTF-8検証をそのまま再利用しました。ページ、重複判定ロジック、重複一覧UI、固有テストだけを新規に追加しています。

Tool #003後のFactory改善として `tools.json` をTool Registry化し、トップページのToolカードとsitemapをbuild時生成へ移行しました。`tests/registry.test.mjs` でpublished Toolの表示順、トップページ反映、sitemap反映、未公開Toolの除外を検証します。

Tool #004では、共通CSV parser / serializer / UTF-8検証を再利用し、全列が空のデータ行だけを削除して新しいCSVを保存します。削除件数、出力プレビュー、Download、Offline動作を確認します。

Tool #005では、共通CSV parser / serializer / UTF-8検証を再利用し、複数のCSVをファイル順に結合して新しいCSVを保存します。ヘッダーの扱い、列構成の検証、Download、Offline動作を確認します。

Tool #006では、共通CSV parser / serializer / UTF-8検証を再利用し、データ行を指定件数ごとに分割して新しいCSVを保存します。各ファイルへのヘッダー付与、行順・値の保持、Download、Offline動作を確認します。

Tool #007では、Tool #003の重複判定ロジックと共通CSV parser / serializer / UTF-8検証を再利用し、指定列をキーに最初の出現だけを残して重複行を削除し、新しいCSVを保存します。行順・値の保持、Download、Offline動作を確認します。

## Human Gate

自動テスト後、[Human Gate checklist](docs/HUMAN_GATE.md) を使って実機確認します。発見事項ごとに自動化可能性を記録してください。

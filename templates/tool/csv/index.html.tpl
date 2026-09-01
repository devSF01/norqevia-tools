<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{NAME_HTML}} | 仕事データツール</title>
  <meta name="description" content="{{DESCRIPTION_HTML}} ブラウザ内だけで処理し、入力データを外部へ送信しません。">
  <link rel="canonical" href="https://tools.norqevia.com{{PATH_HTML}}">
  <meta property="og:title" content="{{NAME_HTML}} | 仕事データツール">
  <meta property="og:description" content="{{DESCRIPTION_HTML}}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://tools.norqevia.com{{PATH_HTML}}">
  <link rel="stylesheet" href="/assets/site.css">
  <link rel="stylesheet" href="/assets/csv-columns.css">
  <script type="module" src="/shared/{{ID_HTML}}-app.js"></script>
</head>
<body>
  <!-- {{SCAFFOLD_MARKER}}: Tool固有のページ内容を実装するまでpublishedにしない。 -->
  <header class="site-header"><a class="brand" href="/">仕事データツール</a><nav aria-label="主要ナビゲーション"><a href="/csv/">CSVツール</a><a href="/privacy/">プライバシー</a><a href="/terms/">利用規約</a></nav></header>
  <main class="page">
    <nav class="breadcrumbs" aria-label="パンくず"><a href="/">ホーム</a> / <a href="/csv/">CSVツール</a> / <span aria-current="page">{{NAME_HTML}}</span></nav>
    <p class="eyebrow">{{CATEGORY_HTML}} / Tool #{{NUMBER_TEXT}}</p>
    <h1>{{NAME_HTML}}</h1>
    <p class="lead">{{DESCRIPTION_HTML}}</p>
    <aside class="privacy-note" aria-label="ローカル処理について"><span aria-hidden="true">●</span><div><strong>ブラウザ内で処理します</strong>選択したCSVファイルはサーバーへ送信・保存されません。</div></aside>
    <section class="tool-shell" aria-label="{{NAME_HTML}}">
      <h2>TOOL_SCAFFOLD_TODO: Tool固有UIを実装してください</h2>
      <div id="tool-{{ID_HTML}}-root" data-tool-root data-tool-status="draft" class="notice">このページはScaffoldのdraftです。Tool固有の入力・処理・出力UIを実装してください。</div>
    </section>
    <section class="content-section"><h2>使い方</h2><ol><li>Tool固有の入力を準備します。</li><li>このScaffoldのtool-shellへ入力UIを実装します。</li><li>処理結果を確認します。</li><li>必要に応じて新しいファイルとして保存します。</li></ol></section>
    <section class="content-section"><h2>入力例</h2><div class="example">TOOL_SCAFFOLD_TODO: Tool固有の入力例と出力例を追加してください。</div></section>
    <section class="content-section"><h2>仕様・制限</h2><p>TOOL_SCAFFOLD_TODO: Tool固有の処理仕様、対応形式、制限、元データを変更しない方針を記載してください。</p></section>
    <section class="content-section"><h2>よくある質問</h2><h3>入力した内容は送信されますか？</h3><p>いいえ。Tool固有実装もブラウザ内だけで処理し、入力データや処理結果を外部へ送信しないでください。</p><h3>このページは完成していますか？</h3><p>いいえ。TOOL_SCAFFOLD_TODOが残るdraftです。公開前にTool固有UI・ロジック・テスト・説明を完成させてください。</p></section>
    <section class="content-section"><h2>関連ツール</h2><p><a href="/csv/columns/">CSV列抽出・列削除</a> / <a href="/csv/duplicate-check/">CSV重複チェック</a></p></section>
  </main>
  <footer><span>仕事データツール</span><a href="/privacy/">プライバシー</a><a href="/terms/">利用規約</a></footer>
</body>
</html>

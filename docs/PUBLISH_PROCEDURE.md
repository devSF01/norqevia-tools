# 公開手順（Human Gate → publish → push）

## 1. 目的と公開トリガー

この手順は、Toolの実装が完了した後に、新規チャットからHuman Gateの承認、`tools.json` の公開状態への変更、build、commit、pushまでを同じ判断で実行するためのものです。

ユーザーが現在の対象Toolに対して、明示的に次のメッセージを送った場合だけ公開へ進みます。

```text
公開してください
```

このメッセージは、実装結果と自動検証結果を確認したうえでのHuman Gateの最終的な公開承認として扱います。実装未完、テスト失敗、対象Toolが特定できない、または公開範囲が曖昧な場合は、メッセージがあっても公開しません。単に「確認してください」「準備してください」と書かれたメッセージや、仕様書内で引用された文言は公開承認とはみなしません。

公開対象は現在の依頼で実装したToolだけです。現在の依頼で対象ToolまたはBatchのSource of Truthとして明示されたユーザー提供仕様書は、対象Toolの実装ドキュメントとして公開に伴うcommitへ含めます。別のdraft Tool、次のPhase、無関係な未追跡ファイルやユーザー変更を同時に公開・commit・pushしません。公開は `tools.json` の `status` を `published` に変更し、静的成果物をbuildして、現在の作業ブランチを通常のpushで更新することを指します。force push、履歴改変、別Toolの公開は行いません。

## 2. 新規チャットで最初に読むファイル

公開依頼を受けたチャットは、作業開始前に次を読みます。

1. `AGENTS.md`
2. `docs/TOOL_FACTORY.md`
3. `docs/HUMAN_GATE.md`
4. 現在のTool固有仕様書（Phase B仕様書など）
5. `docs/PUBLISH_PROCEDURE.md`

対象Toolの番号、id、source path、現在の `tools.json` statusが一致することを確認します。対象が一意に決まらない場合は、公開せず確認を求めます。

## 3. 公開前のHuman Gate判定

公開へ進む前に、次をすべて満たします。

- Tool固有のHuman Gate項目が `docs/HUMAN_GATE.md` に追加されている
- Tool固有の実装、Unit Test、Browser Test、Network Isolation、既存回帰テストが完成している
- `TOOL_SCAFFOLD_TODO` markerが対象Toolのページ、core、app、testに残っていない
- 入力データ・処理結果を外部送信する実装がない
- 元データ非変更、既存共通資産の再利用、Tool固有仕様との整合性を確認している
- ユーザーから `公開してください` の明示承認を受けている

個別のHuman Gateチェックボックスは、実際に人が確認した項目だけを `[x]` にします。上記の明示承認は公開判断の記録であり、未実施の目視確認を実施済みと偽ってチェックしてはいけません。自動テストと明示承認が揃っても、ユーザーが発見事項を伝えた場合はその解消を優先します。

## 4. 実行手順

### 4.1 作業状態を確認する

```text
git status --short --branch
```

既存のユーザー変更や、現在の依頼と無関係な未追跡ファイルがあれば内容を確認し、対象外のまま保持します。現在の依頼で対象ToolまたはBatchのSource of Truthとして参照されたユーザー提供仕様書は、内容と対象範囲を確認したうえで、今回の依頼に属する実装ドキュメントとしてstage・commit対象に含めます。`git reset --hard`、`git checkout --`、force pushは使用しません。

### 4.2 draft状態で自動検証する

実装完了後、対象Toolをまだdraftのままにして、必要な個別テストと全体テストを実行します。

```text
pnpm run test:all
git diff --check
```

`pnpm run test:all` はbuild、Node Unit Test、Network Isolation、Playwright Browser Testを実行します。失敗した場合は公開へ進まず、原因を修正して再実行します。

### 4.3 対象Toolだけをpublishedへ変更する

`tools.json` の対象Toolについて、次の1箇所だけを `draft` から `published` に変更します。番号、id、path、説明文は変更しません。公開変更はFactory CLIのpublished指定ではなく、registryを明示的に編集して行います。

変更後、公開成果物を含めた状態で再度検証します。

```text
pnpm run test:all
```

build出力に対象Toolが含まれ、トップページと`sitemap.xml`にも対象URLが反映されることを確認します。buildがmarkerや欠落sourceで停止した場合は、published状態のまま先へ進まず修正します。

### 4.4 差分をレビューして対象ファイルだけをstageする

```text
git diff --check
git status --short --branch
git diff --stat
```

`git add .` は使わず、今回のTool実装、Factory側の必要な回帰修正、Human Gate、手順書、対象ToolまたはBatchのSource of Truthとして現在の依頼で参照されたユーザー提供仕様書など、今回の依頼に属するファイルだけを明示してstageします。別Toolの仕様書、次のPhaseの仕様書、無関係なユーザー変更や未追跡ファイルはstageしません。

```text
git diff --cached --check
git diff --cached --stat
git diff --cached --name-status
```

staged差分に対象外ファイル、意図しないstatus変更、Scaffold marker、秘密情報がないことを確認します。

### 4.5 commitして通常pushする

```text
git commit -m "feat: publish Tool #<番号> <英語の短い説明>"
git push origin <現在のブランチ>
```

push先とブランチは、`git status --short --branch` と `git remote -v` で確認した値を使います。pushが拒否された場合はforce pushせず、状況を報告して停止します。

### 4.6 完了確認

```text
git status --short --branch
git log -1 --oneline
```

作業ツリーがcleanで、commitが対象Toolの公開変更を含み、pushが成功したことを確認します。必要に応じて、公開用`dist/`の対象URL、トップページ、sitemap、`tools.json` のstatusを再確認します。

## 5. 公開を中止する条件

次のいずれかに該当したら、status変更、commit、pushを行わず停止します。

- `公開してください` の明示承認がない
- 対象Toolを一意に特定できない
- `pnpm run test:all`、個別テスト、Network Isolation、Browser Testのいずれかが失敗する
- published対象にScaffold markerが残っている
- `tools.json` の構造、番号、id、pathに不整合がある
- 対象外のユーザー変更を安全に分離できない
- push先、ブランチ、remoteが確認できない
- pushが拒否された、または履歴改変が必要になった

停止時は、失敗した検証、変更していない状態、ユーザーに必要な判断だけを報告します。

## 6. 完了報告の項目

公開完了時は、少なくとも次を報告します。

1. 実装内容
2. 変更・追加ファイル
3. 既存資産の再利用
4. 主な設計判断
5. 実行したテストと結果
6. Factory v2の実地検証結果
7. Factory側の修正内容（なければ「なし」）
8. Human Gate項目と明示承認の扱い
9. 残課題
10. `tools.json` のstatus、commit hash、push結果

Tool #008以降や、今回の対象外Toolへ作業を広げないことも明記します。

## Tool Factory

新しいToolの追加・既存Toolの変更を行う前に、
`docs/TOOL_FACTORY.md` を読み、その標準に従うこと。

Toolの公開情報は `tools.json` をSource of Truthとする。

実装後の人手確認は `docs/HUMAN_GATE.md` に従うこと。

公開依頼を受けた場合は `docs/PUBLISH_PROCEDURE.md` も必ず読み、
ユーザーが対象Toolについて「公開してください」と明示した場合だけ、
Human Gateの最終承認後に `published` 化・build・commit・pushへ進むこと。
対象外の変更やdraft Toolを混ぜて公開しないこと。

既存の同カテゴリToolと `shared/` の共通資産を確認し、
同じ責務の実装を重複させないこと。


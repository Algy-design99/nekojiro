# 記事管理の接続設定

管理画面: https://algy-design99.github.io/nekojiro/admin/

未接続でも端末内下書き、既存記事の閲覧、プレビュー、JSON保存が使えます。端末内下書きは共有PCで使用しないでください。

## 一度だけ必要な設定

GitHubリポジトリの Settings → Secrets and variables → Actions に以下を登録します。秘密の値を記事やチャットへ貼らないでください。

- CLOUDFLARE_API_TOKEN: 対象アカウントの Workers Scripts / Durable Objects のデプロイに必要な権限を持つAPIトークン。
- CLOUDFLARE_ACCOUNT_ID: 対象のアカウントID。
- CMS_GITHUB_TOKEN: このリポジトリだけを対象とするfine-grained PAT。Contents: Read and write、Metadata: Read。承認待ちや有効期限も確認。
- CMS_ADMIN_PASSWORD: 16文字以上の管理者専用パスワード。

登録先: https://github.com/Algy-design99/nekojiro/settings/secrets/actions

Actions → Deploy anonymous board posting → Run workflow を実行します。ヘルスチェックに通った場合だけ admin/config.json が更新されます。

接続後はログイン → 投稿先 → 新規作成または既存記事 → 下書き保存 → プレビュー → 公開。公開はActions成功まで少し待ちます。エラー時は公開済みとみなさずActionsを確認してください。

## 保存先

- 非公開下書き・公開前のアップロード画像: Cloudflare Durable Objects
- 公開本文・画像: GitHubのcontent/、media/
- 一覧・各読み物ページ・RSS: content-publish.ymlが生成
- 閲覧者レス: 別のBoardRoom。編集部の記事とは別管理

公開した本文・画像はGit履歴に残ります。非公開・削除は現在のサイトから外す操作であり、公開履歴の消去ではありません。下書きのファイル保存も利用してください。

## 検証範囲

既存244記事の本文保持、新規公開と非公開の生成、認証・下書き分割保存・競合拒否・レス保持・GitHub更新再試行をローカルで確認。Cloudflare上のHTMLRewriter実行、ログインから実公開までの結合確認は接続後に実施が必要です。

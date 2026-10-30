# 猫じろう情報局 ニュースデータ
GitHub Actions が15分おきに公開RSSを取得し、公開36時間以内の記事のみを `news/latest.json` に保存します。取得に失敗した場合、古い記事を新しい速報と偽らず、前回データを保持します。

FC2側の取得先:
`https://raw.githubusercontent.com/Algy-design99/nekojiro/main/news/latest.json`

JSONは `updated_at`, `count`, `items` を持ち、各記事は `title`, `url`, `source`, `published_at` を持ちます。FC2側でも `updated_at` と `published_at` を再検証してください。GitHub Actions のスケジュール実行は混雑時に遅れる場合があります。

手動実行: GitHub → Actions → Update Nekojiro news → Run workflow。

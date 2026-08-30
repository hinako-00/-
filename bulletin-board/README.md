# 簡単掲示板 (Simple Bulletin Board)

Cloudflare Workers + D1 で動く、誰でも書き込める簡単な掲示板です。
誰かが投稿すると、その内容がページを開いた全員に表示されます。

## 構成

- `src/index.js` — Cloudflare Worker本体（HTML配信 + 投稿API）
- `migrations/0001_init.sql` — D1データベースの初期スキーマ
- `wrangler.toml` — Workers/D1の設定ファイル

## デプロイ手順

1. 依存パッケージをインストール

   ```bash
   npm install
   ```

2. Cloudflareにログイン

   ```bash
   npx wrangler login
   ```

3. D1データベースを作成

   ```bash
   npx wrangler d1 create bulletin_board_db
   ```

   コマンドの出力に表示される `database_id` を `wrangler.toml` の
   `REPLACE_WITH_YOUR_DATABASE_ID` の部分に貼り付けてください。

4. テーブルを作成（マイグレーション適用）

   ```bash
   npm run db:migrate:remote
   ```

5. デプロイ

   ```bash
   npm run deploy
   ```

   デプロイが終わると `https://simple-bulletin-board.<あなたのサブドメイン>.workers.dev`
   のようなURLが発行されます。そのURLにアクセスすれば掲示板が使えます。

## ローカルでの動作確認

```bash
npm run db:migrate:local
npm run dev
```

`http://localhost:8787` にアクセスすると確認できます。

## 機能

- 名前（省略時は「名無しさん」）とメッセージを入力して投稿
- 投稿は新しい順に最大100件まで表示
- 5秒ごとに自動で最新の投稿を取得（他の人の書き込みも見える）
- 認証なし・誰でも自由に書き込み可能
- 入力値はHTMLエスケープして表示するためXSS対策済み
- 名前30文字以内、本文500文字以内の簡単なバリデーションあり

## 注意事項

匿名で誰でも書き込める仕様のため、荒らしやスパム投稿への対策（レート制限、
NGワードフィルタ、削除機能など）は含まれていません。公開運用する場合は
必要に応じて追加してください。

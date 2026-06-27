# 旅行記録マップ

子供との旅行・遠出の写真を地図ベースで整理・可視化するWebアプリ。

## セットアップ

### 1. 環境変数

`.env.local.example` をコピーして `.env.local` を作成し、Supabaseの情報を入力。

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Supabase セットアップ

1. [supabase.com](https://supabase.com) でプロジェクトを作成
2. SQL Editorで `supabase/schema.sql` を実行
3. Storage で `photos` バケットを作成（Public に設定）
4. Storage の RLS ポリシーで `INSERT` と `SELECT` を許可

### 3. 起動

```bash
npm install
npm run dev
```

## 使い方

1. **📷 アップロード** → GPS付き写真を選択
2. 自動でグループ化され、施設候補が表示される
3. 施設名を確認・修正して「確定へ進む」
4. 旅行を選択または新規作成
5. **🗺️ ホーム** の地図で訪問施設を確認

## 技術スタック

- **Next.js** (App Router)
- **Supabase** (DB / Storage)
- **Leaflet + OpenStreetMap** (地図)
- **Nominatim** (施設候補検索)
- **exifr** (EXIF/GPS取得)
- **Tailwind CSS**

## デプロイ (Vercel)

1. Vercel にリポジトリを連携
2. 環境変数 `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定
3. デプロイ

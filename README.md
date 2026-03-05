# Effort Chart v2

活動時間を記録・可視化するパーソナルダッシュボードアプリ。

## 機能

- **タイマー記録**: カテゴリ別に活動時間をワンクリックで計測
- **グラフ可視化**: 積み上げ棒グラフ・タイムライン表示（期間・累積モード切替）
- **目標管理**: 日次・期間目標の設定と達成率トラッキング
- **実績システム**: 43種の実績解除とアニメーション演出
- **WhatPulse連携**: PC使用統計の自動同期
- **ダークモード**: ライト/ダーク/システム テーマ切替
- **PWA対応**: モバイルからもネイティブアプリ感覚で利用可能

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router, Edge Runtime)
- **スタイリング**: Tailwind CSS 4 + shadcn/ui
- **データベース**: Supabase (PostgreSQL + Row Level Security)
- **認証**: Supabase Auth (Google OAuth)
- **グラフ**: Chart.js 4 + react-chartjs-2
- **デプロイ**: Vercel

## セットアップ

### 1. Supabase プロジェクト作成

1. [supabase.com](https://supabase.com) でプロジェクトを作成
2. **Authentication > Providers** で Google を有効化
3. Google OAuth クライアントを設定（[手順](https://supabase.com/docs/guides/auth/social-login/auth-google)）

### 2. データベースマイグレーション

Supabase Dashboard の **SQL Editor** で以下を順番に実行：

```
supabase/migrations/001_profiles_whatpulse.sql
supabase/migrations/002_user_achievements.sql
```

### 3. 環境変数の設定

`.env.local` を作成し、Supabase Dashboard の **Settings > API** から値を取得：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. ローカル開発

```bash
npm install
npm run dev
```

`http://localhost:3000` を開く。

## Vercel デプロイ

### 1. リポジトリを GitHub に push

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/effort-chart-v2.git
git push -u origin main
```

### 2. Vercel でインポート

1. [vercel.com](https://vercel.com) でプロジェクトをインポート
2. **Environment Variables** に以下を追加：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Deploy** を実行

### 3. Supabase の Redirect URL を更新

Vercel のデプロイ URL（例: `https://effort-chart-v2.vercel.app`）を Supabase Dashboard の
**Authentication > URL Configuration > Redirect URLs** に追加：

```
https://your-app.vercel.app/auth/callback
```

## WhatPulse 連携

1. アプリの **プロフィール** ページで WhatPulse アカウント名と API キーを入力
2. **同期** ボタンでデータを取得
3. 自動同期はダッシュボードアクセス時に実行される

## プロジェクト構成

```
Effort_Chart_v2/
├── app/                    # Next.js App Router
│   ├── api/               # Edge API ルート
│   ├── (pages)/           # 各ページ
│   └── layout.tsx
├── components/            # UI コンポーネント
│   ├── charts/            # Chart.js グラフ
│   ├── layout/            # Sidebar, Header, MobileTabBar
│   └── ui/               # Toast など共通 UI
├── contexts/              # React Context (Auth)
├── hooks/                 # カスタムフック
├── lib/
│   ├── achievements/      # 実績システム
│   ├── api/               # サーバー側認証ユーティリティ
│   ├── supabase/          # Supabase クライアント
│   └── utils/             # ユーティリティ関数
├── supabase/migrations/   # DB マイグレーション SQL
└── types/                 # TypeScript 型定義
```

## データベーススキーマ

主要テーブル：

| テーブル | 説明 |
|---------|------|
| `profiles` | ユーザープロフィール・WhatPulse 設定 |
| `categories` | 活動カテゴリ（名前・色・アーカイブ） |
| `records` | 活動記録（開始・終了時刻・カテゴリ） |
| `goals` | 目標（日次・期間・カテゴリ別） |
| `user_achievements` | 解除済み実績 |
| `whatpulse_daily` | WhatPulse 日次統計 |

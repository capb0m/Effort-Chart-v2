# Effort Chart v2 — 実装指示書

> **目的**: このドキュメントは Claude Code がアプリを実装するための完全な指示書です。
> 既存の Supabase DB（スキーマ・データ）をそのまま利用し、フロントエンドとAPIを新規に構築します。

---

## 1. プロジェクト概要

**Effort Chart** は、日々の活動時間を記録・可視化するWebアプリです。
v2 では以下を実現します:

- 技術スタックの刷新（Chakra UI → Tailwind CSS + shadcn/ui）
- WhatPulse キータイプ数連携
- 目標ストリーク（連続達成日数）の記録・表示
- 目標達成率の日/週/月ビュー
- グラフ上の目標ライン（破線）表示（全体目標のみ）
- ダッシュボードでの目標達成演出（初回表示時のみ）
- 記録追加後のリアルタイム再描画
- レスポンシブ対応（モバイル: 画面下部タブバー）
- ダークモード / ライトモード切替
- 実績（Achievements）システム
- Vercel へのデプロイ

---

## 2. 技術スタック

| 技術 | バージョン（目安） | 用途 |
|------|-------------------|------|
| Next.js | 15.x | フレームワーク（App Router） |
| React | 19.x | UI ライブラリ |
| TypeScript | 5.x | 型安全 |
| Tailwind CSS | 4.x | スタイリング |
| shadcn/ui | latest | UIコンポーネント |
| Chart.js | 4.x | グラフ描画 |
| react-chartjs-2 | 5.x | Chart.js の React ラッパー |
| chartjs-plugin-zoom | 2.x | グラフのズーム・パン |
| chartjs-plugin-annotation | 3.x | グラフ上の目標ライン（破線）描画 |
| SWR | 2.x | データフェッチ・キャッシング |
| date-fns | 4.x | 日付操作 |
| canvas-confetti | 1.x | 目標達成の紙吹雪アニメーション |
| Supabase JS | latest | DB・Auth クライアント |
| next-themes | latest | ダーク/ライトモード切替 |

### 開発環境
- パッケージマネージャー: npm
- ビルドツール: Next.js Turbopack
- リンター: ESLint
- デプロイ先: Vercel（フロント + API Routes を一体デプロイ）

---

## 3. 既存データベーススキーマ（変更不可）

以下のテーブルは既存の Supabase DB にすでに存在します。**スキーマ変更は行いません。データもそのまま利用します。**

### 3.1 `categories`

| カラム | 型 | 説明 |
|--------|------|------|
| id | UUID (PK) | |
| user_id | string | Supabase Auth ユーザーID |
| name | string | カテゴリー名 |
| color | string | カラーコード（例: "#FF5733"） |
| is_archived | boolean | アーカイブ済みフラグ（論理削除） |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 3.2 `records`

| カラム | 型 | 説明 |
|--------|------|------|
| id | UUID (PK) | |
| user_id | string | |
| category_id | UUID (FK → categories.id) | |
| start_time | timestamptz | 開始時刻（UTC） |
| end_time | timestamptz | 終了時刻（UTC） |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 3.3 `goals`

| カラム | 型 | 説明 |
|--------|------|------|
| id | UUID (PK) | |
| user_id | string | |
| category_id | UUID or null | null = 全カテゴリー合計の目標 |
| type | 'daily' \| 'period' | デイリー or 期間目標 |
| target_hours | number | 目標時間（時間単位） |
| deadline | timestamptz or null | 期限（期間目標のみ） |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 3.4 `timer_sessions`

| カラム | 型 | 説明 |
|--------|------|------|
| id | UUID (PK) | |
| user_id | string | |
| start_time | timestamptz | タイマー開始時刻（UTC） |
| is_active | boolean | 実行中フラグ |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

## 4. 新規テーブル（Supabase に追加が必要）

以下のテーブルは**ユーザーが手動で Supabase ダッシュボードから作成**します。
マイグレーション SQL を `supabase/migrations/` に配置してください。

### 4.1 `user_profiles`

WhatPulse 連携用のユーザープロフィール情報。

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  whatpulse_username TEXT,
  whatpulse_api_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own profile" ON user_profiles
  FOR ALL USING (auth.uid() = user_id);
```

### 4.2 `whatpulse_daily_stats`

```sql
CREATE TABLE whatpulse_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_keys BIGINT NOT NULL DEFAULT 0,
  total_clicks BIGINT NOT NULL DEFAULT 0,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE whatpulse_daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own stats" ON whatpulse_daily_stats
  FOR ALL USING (auth.uid() = user_id);
```

### 4.3 `user_achievements`

ユーザーが解除した実績を記録するテーブル。

```sql
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own achievements" ON user_achievements
  FOR ALL USING (auth.uid() = user_id);
```

---

## 5. WhatPulse API 連携仕様

### 5.1 使用する API

WhatPulse の**新 Web API (v1)** を使用。

- **ベース URL**: `https://whatpulse.org/api/v1`
- **認証**: `Authorization: Bearer {api_key}` ヘッダー
- **API キー取得**: https://whatpulse.org/go/settings-api-keys

### 5.2 利用エンドポイント

パルス一覧: `GET /api/v1/users/{username}/pulses`
時系列データ: `GET /api/v1/users/{username}/timeseries`

フォールバック（旧API）: `GET https://api.whatpulse.org/pulses.php?user={username}&format=json&start={unix_ts}&end={unix_ts}`

### 5.3 日次キータイプ数の算出ロジック

1. `user_profiles` から認証情報取得
2. 新API → 失敗時旧APIにフォールバック
3. 日付ごとにキータイプ数を合算
4. `whatpulse_daily_stats` に UPSERT キャッシュ
5. キャッシュ: 同日=1時間ごと再取得、過去日=再取得しない

### 5.4 実装上の注意

- API キー未設定: WhatPulse UI 要素を非表示
- レート制限: 1時間に1回以上のフェッチを避ける
- WhatPulse API 呼び出しはサーバーサイド（API Route）からのみ

---

## 6. API エンドポイント一覧

全エンドポイントは Edge Runtime。認証: `Authorization: Bearer {supabase_jwt_token}`

### 6.1 既存エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET/POST/DELETE | `/api/timer` | タイマー操作 |
| GET/POST | `/api/records` | 記録一覧・作成 |
| PATCH/DELETE | `/api/records/[id]` | 記録更新・削除 |
| GET/POST | `/api/categories` | カテゴリー一覧・作成 |
| PATCH/DELETE | `/api/categories/[id]` | カテゴリー更新・アーカイブ |
| GET/POST | `/api/goals` | 目標一覧・作成 |
| DELETE | `/api/goals/[id]` | 目標削除 |
| GET | `/api/charts/stacked` | 積み上げグラフデータ |
| GET | `/api/charts/timeline` | 24時間タイムラインデータ |

### 6.2 新規エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET/PATCH | `/api/profile` | プロフィール取得・更新 |
| GET | `/api/whatpulse/daily` | WhatPulse 日次データ |
| POST | `/api/whatpulse/sync` | WhatPulse 手動同期 |
| GET | `/api/goals/streak` | ストリーク取得 |
| GET | `/api/goals/history` | 達成履歴・達成率 |
| GET | `/api/achievements` | 全実績 + 解除状況 |
| POST | `/api/achievements/check` | 実績解除チェック |

---

## 7. 機能仕様

### 7.1 タイマー機能（既存引き継ぎ）

- 開始・停止、10時間上限で自動停止
- 永続化: LocalStorage + `timer_sessions`
- 停止時にカテゴリー選択モーダル

### 7.2 記録入力（3モード、既存引き継ぎ）

| モード | 入力 |
|--------|-----|
| 1 | 開始時間 + 継続時間 |
| 2 | 開始時間 + 終了時間 |
| 3 | 終了時間 + 継続時間 |

バリデーション: 終了>開始、未来禁止、10時間上限、重複チェック

#### 記録操作後の再描画
mutate 対象: `records`, `goals`, `charts/*`, `goals/streak`, `goals/history`, `achievements`

### 7.3 カテゴリー管理（既存引き継ぎ）

CRUD + 論理削除（`is_archived`）、カラーピッカー、復元可能

### 7.4 目標管理

#### 7.4.1 目標タイプ
- デイリー (`daily`): 毎日0時リセット
- 期間 (`period`): 期日まで累積
- 全体（`category_id: null`）またはカテゴリー別

#### 7.4.2 ストリーク
- 全デイリー目標達成で1日カウント、連続日数を算出

#### 7.4.3 達成履歴・達成率
- `min(実績 / 目標, 1.0)` で算出、日/週/月ビュー

#### 7.4.4 目標達成演出
- ダッシュボードで canvas-confetti + トースト
- LocalStorage (`achievement_shown_{goalId}_{YYYY-MM-DD}`) で初回制御

### 7.5 グラフ

#### 7.5.1 積み上げ面グラフ

- 期間モード / 累積モード、ズーム・パン対応

##### WhatPulse オーバーレイ
- 第2Y軸（右）にキータイプ数折れ線

##### 目標ライン（破線）

**期間モード**:
- **全体デイリー目標（`category_id: null`）のみ**水平破線として描画
- **カテゴリー別デイリー目標の破線は描画しない**（グラフの可読性を優先）
- 色はグレー系

**累積モード**:
- 期間目標を斜め破線（`created_at` → `deadline`）で描画

#### 7.5.2 24時間タイムライン
- ドーナツチャート、日付またぎ対応

### 7.6 WhatPulse キータイプ数表示

- プロフィールで設定、グラフに第2Y軸表示、ダッシュボードにサマリー

### 7.7 認証（既存引き継ぎ）

Google OAuth → Supabase Auth → AuthContext → Bearer トークン

### 7.8 ダーク/ライトモード切替（新規）

- **ライブラリ**: `next-themes`
- **切替UI**: サイドバー下部（デスクトップ）+ プロフィール画面
- **選択肢**: ライト / ダーク / システム
- **実装**: Tailwind `darkMode: 'class'`、`dark:` プレフィックス、CSS 変数で色一元管理
- Chart.js グリッド線・テキスト色もテーマ連動

### 7.9 実績システム（新規）

#### 7.9.1 設計方針

- レジストリパターン: コードにマスター定義、DB は解除記録のみ
- `definitions.ts` にオブジェクト追加するだけで新実績を追加可能

#### 7.9.2 レジストリ構造

```typescript
// lib/achievements/registry.ts
export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  checkCondition: (ctx: AchievementContext) => Promise<boolean>;
}

export type AchievementCategory =
  | 'streak' | 'total_time' | 'records'
  | 'goals' | 'whatpulse' | 'special';

export interface AchievementContext {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  totalRecords: number;
  totalHours: number;
  totalKeystrokes: number;
  periodGoalsCompleted: number;
  dailyGoalsAchievedDays: number;
  categories: number;
  consecutiveDaysRecorded: number;
  longestSingleSession: number;
}
```

#### 7.9.3 解除チェックフロー

1. トリガー: 記録操作後、目標達成時、WhatPulse 同期後
2. `POST /api/achievements/check` で全実績判定
3. 新規解除分を `user_achievements` に INSERT → レスポンスで返却
4. フロントでトースト + アイコンアニメーション

#### 7.9.4 初期実績リスト（43個）

**ストリーク系**: streak_3(3日/bronze), streak_7(7日/silver), streak_14(14日/silver), streak_30(30日/gold), streak_100(100日/platinum), streak_365(365日/platinum)

**累計時間系**: total_hours_10(10h/bronze), total_hours_50(50h/bronze), total_hours_100(100h/silver), total_hours_500(500h/gold), total_hours_1000(1000h/gold), total_hours_5000(5000h/platinum), total_hours_10000(10000h/platinum)

**記録数系**: records_1(初記録/bronze), records_50(50件/bronze), records_100(100件/silver), records_500(500件/silver), records_1000(1000件/gold), daily_max_8h(1日8h+/silver), daily_max_12h(1日12h+/gold)

**目標達成系**: goal_first_daily(初デイリー達成/bronze), goal_first_period(初期間達成/silver), period_goals_3(3個/silver), period_goals_10(10個/gold), perfect_week(1週間100%/gold), perfect_month(1ヶ月100%/platinum)

**WhatPulse系**: keys_10k(1日1万/bronze), keys_50k(1日5万/silver), keys_100k(1日10万/gold), keys_total_1m(累計100万/silver), keys_total_10m(累計1000万/gold)

**特殊系**: early_bird(6AM前開始/bronze), night_owl(深夜0時以降終了/bronze), multi_category_day(1日3カテゴリ+/bronze), weekend_warrior(土日8h+/silver), longest_session_4h(4h連続/silver), categories_5(5カテゴリ+/bronze), consecutive_record_30(30日連続記録/gold), consecutive_record_100(100日連続記録/platinum)

#### 7.9.5 新実績の追加手順

1. `lib/achievements/definitions.ts` に定義追加
2. 必要なら `AchievementContext` にフィールド追加
3. API のコンテキスト構築を更新
4. DB マイグレーション不要

#### 7.9.6 実績画面 UI

- カテゴリー別グループ表示
- 解除済み: カラフル + 解除日時、未解除: グレーアウト + ロック
- 上部サマリー: 解除数/全数、ティア別内訳
- 新規解除: トースト + ポップアップアニメーション

---

## 8. 画面構成

### 8.1 ページ一覧

| ページ | パス | 説明 |
|--------|------|------|
| ログイン | `/` | 未認証時のみ |
| ダッシュボード | `/dashboard` | タイマー、進捗、グラフ、ストリーク |
| 記録 | `/records` | 追加・一覧・タイムライン |
| カテゴリー | `/categories` | CRUD + アーカイブ |
| 目標 | `/goals` | 設定・達成履歴 |
| グラフ | `/charts` | 積み上げ面・タイムライン |
| 実績 | `/achievements` | 実績一覧・解除状況 |
| プロフィール | `/profile` | WhatPulse設定・テーマ切替 |

### 8.2 レスポンシブ

- デスクトップ: サイドバー（テーマ切替トグル付き）
- モバイル: 下部タブバー 5項目（ホーム/記録/目標/グラフ/その他）

### 8.3 ダッシュボード構成

1. タイマー 2. デイリー目標プログレス 3. ストリーク 4. ミニグラフ+全体目標ライン 5. キータイプ数 6. クイックナビ 7. 達成演出エリア

---

## 9. ディレクトリ構成

```
effort-chart-v2/
├── app/
│   ├── layout.tsx                    # AuthProvider + ThemeProvider
│   ├── page.tsx                      # ログイン
│   ├── dashboard/page.tsx
│   ├── records/page.tsx
│   ├── categories/page.tsx
│   ├── goals/page.tsx
│   ├── charts/page.tsx
│   ├── achievements/page.tsx         # 新規
│   ├── profile/page.tsx
│   └── api/
│       ├── timer/route.ts
│       ├── records/[route.ts, [id]/route.ts]
│       ├── categories/[route.ts, [id]/route.ts]
│       ├── goals/[route.ts, [id]/route.ts, streak/route.ts, history/route.ts]
│       ├── charts/[stacked/route.ts, timeline/route.ts]
│       ├── profile/route.ts
│       ├── achievements/[route.ts, check/route.ts]  # 新規
│       └── whatpulse/[daily/route.ts, sync/route.ts]
├── components/
│   ├── layout/[Sidebar, MobileTabBar, Header, ThemeToggle]
│   ├── timer/[Timer, TimerSaveModal]
│   ├── records/[RecordForm]
│   ├── categories/[CategoryList, CategoryForm]
│   ├── goals/[GoalProgressBar, StreakDisplay, AchievementHistory]
│   ├── charts/[StackedAreaChart, TimelineDonutChart]
│   ├── dashboard/[AchievementCelebration]
│   ├── achievements/[AchievementCard, AchievementGrid, AchievementNotification]  # 新規
│   ├── profile/[WhatPulseSettings]
│   └── ui/ (shadcn/ui)
├── hooks/[useCategories, useGoals, useStreak, useGoalHistory, useWhatPulse, useAchievements]
├── lib/
│   ├── supabase/[client, server]
│   ├── achievements/[registry, definitions, checker]  # 新規
│   └── utils/[date, validation, whatpulse]
├── types/database.ts
├── supabase/migrations/[001_profiles_whatpulse.sql, 002_user_achievements.sql]
└── mocks/*.html
```

---

## 10. データフェッチ (SWR)

| データ | dedupingInterval |
|--------|-----------------|
| カテゴリー | 60秒 |
| 記録 | 0 |
| 目標 | 300秒 |
| ストリーク | 300秒 |
| 達成履歴 | 300秒 |
| グラフ | 300秒 |
| タイムライン | 0 |
| WhatPulse | 3600秒 |
| プロフィール | 60秒 |
| 実績 | 60秒 |

記録操作後: `records`, `goals`, `charts`, `achievements` を一括 mutate

---

## 11〜14. タイムゾーン・セキュリティ・環境変数・デプロイ

（変更なし、前版と同一）
- DB は UTC、フロントで変換、`tz` パラメータで日次リセット計算
- Edge Runtime、RLS（`user_achievements` 含む）、WhatPulse API キー保護
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Vercel デプロイ（フロント + API Routes 一体）

---

## 15. 実装優先順位

### Phase 1: 基盤
1. Next.js + Tailwind + shadcn/ui 初期化
2. Supabase クライアント
3. Google OAuth + AuthContext
4. レイアウト（サイドバー + タブバー）
5. **テーマ切替（next-themes）**

### Phase 2: コア（既存再実装）
6. カテゴリー CRUD
7. 記録 CRUD（3モード）
8. タイマー
9. 積み上げ面グラフ
10. 24時間タイムライン
11. 目標 CRUD + プログレスバー

### Phase 3: 新機能
12. **全体目標ライン（破線）のみグラフ表示**
13. リアルタイム再描画（SWR mutate）
14. ストリーク
15. 達成履歴・達成率
16. 達成演出
17. プロフィール + WhatPulse 設定
18. WhatPulse API 連携
19. **実績システム**

### Phase 4: 仕上げ
20. レスポンシブ調整
21. エラーハンドリング統一
22. Vercel デプロイ

---

## 16. UI モック

`/mocks/` に格納。モック存在時はデザインを忠実に再現すること。
テーマ: ダーク/ライト両対応。

---

## 17. コーディング規約

- TypeScript strict、関数コンポーネント + Hooks のみ
- Edge Runtime、PascalCase/camelCase
- **全コンポーネントで `dark:` プレフィックス使用、ハードコード色禁止**
- エラー: try-catch + トースト

---

## 18. 変更点まとめ

| 項目 | v1 | v2 |
|------|----|----|
| UI | Chakra UI v3 | Tailwind + shadcn/ui |
| ホスティング | ローカル | Vercel |
| 達成演出 | 目標タブ | ダッシュボード（初回のみ） |
| 目標ライン | なし | **全体デイリー目標のみ水平破線** + 期間目標は斜め破線 |
| WhatPulse | なし | 第2Y軸表示 |
| ストリーク | なし | 連続達成日数 |
| 達成率 | なし | 日/週/月リスト |
| 再描画 | 部分的 | 全関連データ一括 mutate |
| モバイル | 限定的 | タブバー + レスポンシブ |
| テーマ | ダークのみ | **ダーク/ライト/システム切替** |
| 実績 | なし | **レジストリパターンで43個+** |

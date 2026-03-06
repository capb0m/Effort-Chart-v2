export type AchievementCategory =
  | "streak"
  | "total_time"
  | "records"
  | "goals"
  | "whatpulse"
  | "special";

export interface AchievementContext {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  totalRecords: number;
  totalHours: number;
  totalKeystrokes: number;       // 日次最大キーストローク数
  cumulativeKeystrokes: number;  // 累計キーストローク数
  periodGoalsCompleted: number;
  dailyGoalsAchievedDays: number;
  categories: number;
  consecutiveDaysRecorded: number;
  longestSingleSession: number;
  maxDailyHours: number;         // 1日の最大合計時間
  hasEarlyMorningRecord: boolean; // 午前4〜5時台に活動開始
  hasLateNightRecord: boolean;    // 午前2〜5時台に活動終了
  hasShortSession: boolean;       // 5分未満の記録あり
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  tier: "bronze" | "silver" | "gold" | "platinum";
  checkCondition: (ctx: AchievementContext) => Promise<boolean>;
}

export const ACHIEVEMENT_TIER_COLORS = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#ffd700",
  platinum: "#e5e4e2",
} as const;

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  streak: "ストリーク",
  total_time: "累計時間",
  records: "記録",
  goals: "目標達成",
  whatpulse: "WhatPulse",
  special: "特殊",
};

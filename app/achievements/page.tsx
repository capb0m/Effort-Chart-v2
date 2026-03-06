"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { Header } from "@/components/layout/Header";
import { useAchievements } from "@/hooks/useAchievements";
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  ACHIEVEMENT_TIER_COLORS,
  AchievementCategory,
} from "@/lib/achievements/registry";
import { cn } from "@/lib/utils/cn";
import { Lock } from "lucide-react";

const TIER_ORDER = ["platinum", "gold", "silver", "bronze"] as const;

interface StatsData {
  totalHours: number;
  totalKeys: number;
  maxDailyKeys: number;
  totalRecords: number;
  currentStreak: number;
  longestStreak: number;
  dailyGoalsAchievedDays: number;
  categories: number;
  consecutiveDaysRecorded: number;
  longestSingleSession: number;
  maxDailyHours: number;
}

interface Progress {
  current: number;
  target: number;
  unit: string;
}

function fmtNum(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(v);
}

function fmtHours(v: number): string {
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

function fmtProgress(p: Progress): string {
  const isHours = p.unit === "h";
  const cur = isHours ? fmtHours(Math.min(p.current, p.target)) : fmtNum(Math.min(p.current, p.target));
  const tgt = isHours ? fmtHours(p.target) : fmtNum(p.target);
  return `${cur}${p.unit} / ${tgt}${p.unit}`;
}

const PROGRESS_MAP: Record<string, (s: StatsData) => Progress | null> = {
  // ストリーク
  streak_3:   (s) => ({ current: s.currentStreak, target: 3,   unit: "日" }),
  streak_7:   (s) => ({ current: s.currentStreak, target: 7,   unit: "日" }),
  streak_14:  (s) => ({ current: s.currentStreak, target: 14,  unit: "日" }),
  streak_21:  (s) => ({ current: s.currentStreak, target: 21,  unit: "日" }),
  streak_30:  (s) => ({ current: s.currentStreak, target: 30,  unit: "日" }),
  streak_50:  (s) => ({ current: s.currentStreak, target: 50,  unit: "日" }),
  streak_100: (s) => ({ current: s.currentStreak, target: 100, unit: "日" }),
  streak_200: (s) => ({ current: s.currentStreak, target: 200, unit: "日" }),
  streak_365: (s) => ({ current: s.currentStreak, target: 365, unit: "日" }),

  // 累計時間
  total_hours_10:    (s) => ({ current: s.totalHours, target: 10,    unit: "h" }),
  total_hours_25:    (s) => ({ current: s.totalHours, target: 25,    unit: "h" }),
  total_hours_50:    (s) => ({ current: s.totalHours, target: 50,    unit: "h" }),
  total_hours_100:   (s) => ({ current: s.totalHours, target: 100,   unit: "h" }),
  total_hours_200:   (s) => ({ current: s.totalHours, target: 200,   unit: "h" }),
  total_hours_500:   (s) => ({ current: s.totalHours, target: 500,   unit: "h" }),
  total_hours_1000:  (s) => ({ current: s.totalHours, target: 1000,  unit: "h" }),
  total_hours_2000:  (s) => ({ current: s.totalHours, target: 2000,  unit: "h" }),
  total_hours_5000:  (s) => ({ current: s.totalHours, target: 5000,  unit: "h" }),
  total_hours_10000: (s) => ({ current: s.totalHours, target: 10000, unit: "h" }),

  // 記録数
  records_1:    (s) => ({ current: s.totalRecords, target: 1,    unit: "件" }),
  records_10:   (s) => ({ current: s.totalRecords, target: 10,   unit: "件" }),
  records_50:   (s) => ({ current: s.totalRecords, target: 50,   unit: "件" }),
  records_100:  (s) => ({ current: s.totalRecords, target: 100,  unit: "件" }),
  records_200:  (s) => ({ current: s.totalRecords, target: 200,  unit: "件" }),
  records_500:  (s) => ({ current: s.totalRecords, target: 500,  unit: "件" }),
  records_1000: (s) => ({ current: s.totalRecords, target: 1000, unit: "件" }),
  records_2000: (s) => ({ current: s.totalRecords, target: 2000, unit: "件" }),
  records_5000: (s) => ({ current: s.totalRecords, target: 5000, unit: "件" }),

  // セッション長
  daily_max_8h:       (s) => ({ current: s.longestSingleSession, target: 8,  unit: "h" }),
  daily_max_12h:      (s) => ({ current: s.longestSingleSession, target: 12, unit: "h" }),
  longest_session_4h: (s) => ({ current: s.longestSingleSession, target: 4,  unit: "h" }),
  marathon_session:   (s) => ({ current: s.longestSingleSession, target: 6,  unit: "h" }),
  weekend_warrior:    (s) => ({ current: s.longestSingleSession, target: 8,  unit: "h" }),

  // 目標達成日数
  goal_first_daily:    (s) => ({ current: s.dailyGoalsAchievedDays, target: 1,   unit: "日" }),
  daily_goals_10days:  (s) => ({ current: s.dailyGoalsAchievedDays, target: 10,  unit: "日" }),
  daily_goals_50days:  (s) => ({ current: s.dailyGoalsAchievedDays, target: 50,  unit: "日" }),
  daily_goals_100days: (s) => ({ current: s.dailyGoalsAchievedDays, target: 100, unit: "日" }),
  perfect_week:        (s) => ({ current: s.currentStreak, target: 7,  unit: "日" }),
  perfect_month:       (s) => ({ current: s.currentStreak, target: 30, unit: "日" }),

  // WhatPulse 日次最高
  keys_1k:   (s) => ({ current: s.maxDailyKeys, target: 1_000,   unit: "keys" }),
  keys_5k:   (s) => ({ current: s.maxDailyKeys, target: 5_000,   unit: "keys" }),
  keys_10k:  (s) => ({ current: s.maxDailyKeys, target: 10_000,  unit: "keys" }),
  keys_50k:  (s) => ({ current: s.maxDailyKeys, target: 50_000,  unit: "keys" }),
  keys_100k: (s) => ({ current: s.maxDailyKeys, target: 100_000, unit: "keys" }),
  keys_200k: (s) => ({ current: s.maxDailyKeys, target: 200_000, unit: "keys" }),

  // WhatPulse 累計
  keys_total_500k: (s) => ({ current: s.totalKeys, target: 500_000,    unit: "keys" }),
  keys_total_1m:   (s) => ({ current: s.totalKeys, target: 1_000_000,  unit: "keys" }),
  keys_total_5m:   (s) => ({ current: s.totalKeys, target: 5_000_000,  unit: "keys" }),
  keys_total_10m:  (s) => ({ current: s.totalKeys, target: 10_000_000, unit: "keys" }),
  keys_total_50m:  (s) => ({ current: s.totalKeys, target: 50_000_000, unit: "keys" }),

  // 特殊 - 連続記録
  consecutive_record_30:  (s) => ({ current: s.consecutiveDaysRecorded, target: 30,  unit: "日" }),
  consecutive_record_100: (s) => ({ current: s.consecutiveDaysRecorded, target: 100, unit: "日" }),
  anniversary:            (s) => ({ current: s.consecutiveDaysRecorded, target: 365, unit: "日" }),

  // 特殊 - カテゴリー
  multi_category_day: (s) => ({ current: s.categories, target: 3,  unit: "個" }),
  categories_5:       (s) => ({ current: s.categories, target: 5,  unit: "個" }),
  categories_10:      (s) => ({ current: s.categories, target: 10, unit: "個" }),

  // 特殊 - 1日合計時間
  full_day_record: (s) => ({ current: s.maxDailyHours, target: 12, unit: "h" }),
};

export default function AchievementsPage() {
  const { user, loading, session } = useAuth();
  const router = useRouter();
  const { achievements, loading: achLoading } = useAchievements();
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!session?.access_token) return;
    fetch("/api/stats", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, [session?.access_token]);

  if (loading || !user) return null;

  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;
  const totalCount = achievements.length;

  const categories = Object.keys(ACHIEVEMENT_CATEGORY_LABELS) as AchievementCategory[];

  const tierCounts = TIER_ORDER.reduce((acc, tier) => {
    acc[tier] = {
      total: achievements.filter((a) => a.tier === tier).length,
      unlocked: achievements.filter((a) => a.tier === tier && a.unlockedAt).length,
    };
    return acc;
  }, {} as Record<string, { total: number; unlocked: number }>);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-hide pb-20 lg:pb-0">
        <Header title="実績" />
        <div className="px-4 lg:px-8 py-6 space-y-6 max-w-4xl">

          {/* Summary */}
          <div className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-3xl font-bold">{unlockedCount}<span className="text-lg font-normal text-gray-400 dark:text-white/40">/{totalCount}</span></div>
                <div className="text-sm text-gray-500 dark:text-white/40">解除済み</div>
              </div>
              <div className="flex gap-3">
                {TIER_ORDER.map((tier) => (
                  <div key={tier} className="text-center">
                    <div className="text-lg font-bold" style={{ color: ACHIEVEMENT_TIER_COLORS[tier] }}>
                      {tierCounts[tier]?.unlocked ?? 0}
                    </div>
                    <div className="text-[10px] text-gray-400 dark:text-white/30 capitalize">{tier}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-orange-500 rounded-full transition-all"
                style={{ width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Category Groups */}
          {achLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 bg-gray-100 dark:bg-white/[0.04] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            categories.map((cat) => {
              const catAchievements = achievements.filter((a) => a.category === cat);
              if (catAchievements.length === 0) return null;
              const catUnlocked = catAchievements.filter((a) => a.unlockedAt).length;

              return (
                <div key={cat} className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
                    <h2 className="text-sm font-medium text-gray-500 dark:text-white/50 uppercase tracking-wider">
                      {ACHIEVEMENT_CATEGORY_LABELS[cat]}
                    </h2>
                    <span className="text-xs text-gray-400 dark:text-white/30">{catUnlocked}/{catAchievements.length}</span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {catAchievements.map((achievement) => {
                      const isUnlocked = !!achievement.unlockedAt;
                      const tierColor = ACHIEVEMENT_TIER_COLORS[achievement.tier];
                      const progress = !isUnlocked && stats ? PROGRESS_MAP[achievement.id]?.(stats) ?? null : null;
                      const pct = progress ? Math.min(100, (progress.current / progress.target) * 100) : 0;

                      return (
                        <div
                          key={achievement.id}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-xl border transition",
                            isUnlocked
                              ? "border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03]"
                              : "border-gray-100 dark:border-white/[0.04] opacity-60"
                          )}
                        >
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 mt-0.5", !isUnlocked && "grayscale")}
                            style={{ backgroundColor: isUnlocked ? tierColor + "33" : undefined }}>
                            {isUnlocked ? achievement.icon : <Lock className="w-4 h-4 text-gray-400 dark:text-white/30" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium truncate">{achievement.name}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium capitalize flex-shrink-0"
                                style={{ backgroundColor: tierColor + "33", color: tierColor }}>
                                {achievement.tier}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 dark:text-white/40 truncate">{achievement.description}</div>
                            {isUnlocked && achievement.unlockedAt && (
                              <div className="text-[10px] text-gray-300 dark:text-white/20 mt-0.5">
                                {new Date(achievement.unlockedAt).toLocaleDateString("ja-JP")}
                              </div>
                            )}
                            {!isUnlocked && progress && (
                              <div className="mt-1.5 space-y-1">
                                <div className="h-1 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{ width: `${pct}%`, backgroundColor: tierColor }}
                                  />
                                </div>
                                <div className="text-[10px] font-mono" style={{ color: tierColor }}>
                                  {fmtProgress(progress)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
      <MobileTabBar />
    </div>
  );
}

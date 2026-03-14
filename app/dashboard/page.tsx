"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { Header } from "@/components/layout/Header";
import { Timer } from "@/components/timer/Timer";
import { useGoals, useStreak } from "@/hooks/useGoals";
import { useCategories } from "@/hooks/useCategories";
import { useWhatPulse } from "@/hooks/useWhatPulse";
import { useAchievements } from "@/hooks/useAchievements";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils/date";
import { mutate } from "swr";
import Link from "next/link";
import { ExternalLink, Flame, Keyboard, Trophy, RefreshCw } from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils/cn";

// ---- 累計時間 ----
interface CumulativeEntry {
  categoryId: string;
  categoryName: string;
  color: string;
  totalHours: number;
}

interface CumulativeCache {
  totals: CumulativeEntry[];
  cachedAt: string; // YYYY-MM-DD
}

function formatCumulativeHours(h: number): string {
  if (h < 10) return h.toFixed(1);
  return Math.round(h).toString();
}

function useCumulativeTotals() {
  const { session, user } = useAuth();
  const [data, setData] = useState<CumulativeCache | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token || !user) return;

    const today = new Date().toLocaleDateString("sv");
    const cacheKey = `effort_cumulative_${user.id}_${today}`;

    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        setData(JSON.parse(raw) as CumulativeCache);
        setLoading(false);
        return;
      }
    } catch {
      // ignore parse errors
    }

    fetch("/api/stats/cumulative", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((res: { totals: CumulativeEntry[] }) => {
        const cache: CumulativeCache = { totals: res.totals, cachedAt: today };
        try { localStorage.setItem(cacheKey, JSON.stringify(cache)); } catch { /* ignore */ }
        setData(cache);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session?.access_token, user?.id]);

  return { data, loading };
}

// デイリー目標の進捗を取得するフック
// ローカルタイムゾーンの今日の日付を返す (YYYY-MM-DD)
function getLocalToday() {
  return new Date().toLocaleDateString("sv");
}

function useTodayProgress() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [progress, setProgress] = useState<{ goal: { id: string; target_hours: number; category_id: string | null }; actual: number; category_name: string }[]>([]);
  const [today, setToday] = useState(getLocalToday);

  // 日付が変わったら today を更新（1分ごとにチェック）
  useEffect(() => {
    const id = setInterval(() => setToday(getLocalToday()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    // ローカル日付の 00:00〜23:59 を UTC に変換して渡す
    const startUtc = new Date(today + "T00:00:00").toISOString();
    const endUtc = new Date(today + "T23:59:59").toISOString();

    Promise.all([
      fetch("/api/goals", { headers }).then((r) => r.json()),
      fetch(`/api/records?start=${encodeURIComponent(startUtc)}&end=${encodeURIComponent(endUtc)}`, { headers }).then((r) => r.json()),
      fetch("/api/categories", { headers }).then((r) => r.json()),
    ]).then(([goals, records, categories]) => {
      const dailyGoals = (goals as { id: string; type: string; target_hours: number; category_id: string | null }[]).filter((g) => g.type === "daily");
      const catMap = new Map((categories as { id: string; name: string }[]).map((c) => [c.id, c.name]));

      // 記録を集計
      const totalMap = new Map<string | null, number>();
      let totalAll = 0;
      for (const r of records as { category_id: string; start_time: string; end_time: string }[]) {
        const h = (new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) / (1000 * 60 * 60);
        totalMap.set(r.category_id, (totalMap.get(r.category_id) ?? 0) + h);
        totalAll += h;
      }
      totalMap.set(null, totalAll);

      setProgress(dailyGoals.map((g) => ({
        goal: g,
        actual: totalMap.get(g.category_id) ?? 0,
        category_name: g.category_id ? (catMap.get(g.category_id) ?? "不明") : "全カテゴリー合計",
      })));
    }).catch(console.error);
  }, [token, today]);

  return progress;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { streak } = useStreak();
  const { whatpulse, syncError: whatpulseSyncError, isSyncing: whatpulseSyncing, sync: syncWhatPulse } = useWhatPulse();
  const { achievements, mutate: mutateAchievements } = useAchievements();
  const { toast } = useToast();
  const progress = useTodayProgress();
  const shownRef = useRef<Set<string>>(new Set());
  const { data: cumulativeData, loading: cumulativeLoading } = useCumulativeTotals();
  const [activeTabIdx, setActiveTabIdx] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  // 目標達成演出（初回のみ）
  useEffect(() => {
    for (const p of progress) {
      if (p.actual >= p.goal.target_hours) {
        const key = `achievement_shown_${p.goal.id}_${new Date().toISOString().split("T")[0]}`;
        if (!localStorage.getItem(key) && !shownRef.current.has(key)) {
          shownRef.current.add(key);
          localStorage.setItem(key, "1");
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
          toast(`🎉 「${p.category_name}」の目標を達成しました！`, "success");
        }
      }
    }
  }, [progress]);

  if (loading || !user) return null;

  const achievedCount = progress.filter((p) => p.actual >= p.goal.target_hours).length;
  const recentAchievement = achievements.find((a) => a.unlockedAt);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-hide pb-20 lg:pb-0">
        <Header
          title="ダッシュボード"
          subtitle={formatDate(new Date())}
          action={{ label: "記録を追加", href: "/records" }}
        />

        <div className="px-4 lg:px-8 py-6 space-y-6 max-w-6xl">
          {/* Timer + Streak */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Timer onSaved={() => mutate((key) => Array.isArray(key) && key[0]?.startsWith?.("/api"), undefined, { revalidate: true })} />
            </div>
            <div className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 transition-colors">
              <h2 className="text-sm font-medium text-gray-500 dark:text-white/50 uppercase tracking-wider mb-4">
                ストリーク
              </h2>
              <div className="text-center">
                <div className="inline-flex items-center gap-2 mb-2">
                  <Flame className="w-8 h-8 text-orange-500" />
                  <span className="text-5xl font-bold text-orange-500 dark:text-orange-400 font-mono">
                    {streak?.currentStreak ?? 0}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-white/40">連続達成日数</p>
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/[0.06] flex justify-between text-xs text-gray-400 dark:text-white/30">
                  <span>最長記録</span>
                  <span className="text-gray-600 dark:text-white/60 font-medium">
                    {streak?.longestStreak ?? 0}日
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Goals */}
          {progress.length > 0 && (
            <div className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 transition-colors">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-medium text-gray-500 dark:text-white/50 uppercase tracking-wider">
                  今日のデイリー目標
                </h2>
                <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                  {achievedCount}/{progress.length} 達成
                </span>
              </div>
              <div className="space-y-4">
                {progress.map(({ goal, actual, category_name }) => {
                  const pct = Math.min((actual / goal.target_hours) * 100, 100);
                  const achieved = actual >= goal.target_hours;
                  return (
                    <div key={goal.id}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-violet-400" />
                          <span className="text-sm font-medium">{category_name}</span>
                          {achieved && (
                            <span className="text-xs bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
                              達成 ✓
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500 dark:text-white/60 font-mono">
                          {actual.toFixed(1)}h / {goal.target_hours}h
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: achieved ? "#22c55e" : "#8b5cf6",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cumulative Totals */}
          {(cumulativeLoading || (cumulativeData && cumulativeData.totals.length > 0)) && (
            <div className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-gray-500 dark:text-white/50 uppercase tracking-wider">
                  累計時間
                </h2>
                {cumulativeData && (
                  <span className="text-xs text-gray-400 dark:text-white/30">
                    {cumulativeData.cachedAt} 時点
                  </span>
                )}
              </div>

              {cumulativeLoading ? (
                <div className="space-y-3">
                  <div className="h-8 bg-gray-100 dark:bg-white/[0.04] rounded-lg animate-pulse w-48" />
                  <div className="h-16 bg-gray-100 dark:bg-white/[0.04] rounded-xl animate-pulse" />
                </div>
              ) : cumulativeData && cumulativeData.totals.length > 0 ? (() => {
                const totals = cumulativeData.totals;
                const safeIdx = Math.min(activeTabIdx, totals.length - 1);
                const selected = totals[safeIdx];
                const maxHours = totals[0]?.totalHours ?? 1;
                return (
                  <>
                    {/* Scrollable category tabs */}
                    <div className="flex gap-1 overflow-x-auto pb-1 mb-5 scrollbar-hide">
                      {totals.map((t, i) => (
                        <button
                          key={t.categoryId}
                          onClick={() => setActiveTabIdx(i)}
                          className={cn(
                            "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap",
                            safeIdx === i
                              ? "bg-gray-100 dark:bg-white/[0.08] text-gray-900 dark:text-white shadow-sm"
                              : "text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60"
                          )}
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: t.color }}
                          />
                          {t.categoryName}
                        </button>
                      ))}
                    </div>

                    {/* Selected category detail */}
                    <div className="flex items-end gap-3 mb-5">
                      <span
                        className="text-5xl font-bold font-mono leading-none"
                        style={{ color: selected.color }}
                      >
                        {formatCumulativeHours(selected.totalHours)}
                      </span>
                      <span className="text-xl text-gray-400 dark:text-white/30 mb-0.5">h</span>
                      <span className="text-sm text-gray-400 dark:text-white/30 mb-1 ml-1">
                        累計
                      </span>
                    </div>

                    {/* All categories bar chart */}
                    <div className="space-y-2">
                      {totals.map((t, i) => (
                        <button
                          key={t.categoryId}
                          onClick={() => setActiveTabIdx(i)}
                          className={cn(
                            "w-full text-left group",
                            safeIdx === i && "opacity-100",
                            safeIdx !== i && "opacity-60 hover:opacity-80"
                          )}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-gray-500 dark:text-white/40">{t.categoryName}</span>
                            <span className="text-xs font-mono text-gray-600 dark:text-white/50">
                              {formatCumulativeHours(t.totalHours)}h
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${maxHours > 0 ? (t.totalHours / maxHours) * 100 : 0}%`,
                                backgroundColor: t.color,
                              }}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                );
              })() : null}
            </div>
          )}

          {/* WhatPulse + Recent Achievement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {whatpulse?.hasConfig && (
              <div className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-gray-500 dark:text-white/50 uppercase tracking-wider">
                    <Keyboard className="w-4 h-4 inline mr-1.5" />
                    キータイプ
                  </h2>
                  <button
                    onClick={syncWhatPulse}
                    disabled={whatpulseSyncing}
                    className="flex items-center gap-1 text-xs text-gray-400 dark:text-white/30 hover:text-violet-500 dark:hover:text-violet-400 transition disabled:opacity-50"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", whatpulseSyncing && "animate-spin")} />
                    同期
                  </button>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold font-mono">
                    {whatpulse.today.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-400 dark:text-white/30">回</span>
                </div>
                <p className="text-xs text-gray-400 dark:text-white/30 mt-1">本日（WhatPulse）</p>
                {whatpulseSyncError && (
                  <p className="text-xs text-red-400 mt-1 break-all">{whatpulseSyncError}</p>
                )}
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/[0.06]">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400 dark:text-white/30">昨日</span>
                    <span className="text-gray-600 dark:text-white/50 font-mono">
                      {whatpulse.yesterday.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 transition-colors">
              <h2 className="text-sm font-medium text-gray-500 dark:text-white/50 uppercase tracking-wider mb-3">
                <Trophy className="w-4 h-4 inline mr-1.5" />
                最近の実績
              </h2>
              {recentAchievement ? (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{recentAchievement.icon}</span>
                    <div>
                      <div className="text-sm font-medium">{recentAchievement.name}</div>
                      <div className="text-xs text-gray-400 dark:text-white/40">{recentAchievement.description}</div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400 dark:text-white/40 mb-3">まだ実績がありません</p>
              )}
              <Link href="/achievements" className="text-xs text-violet-600 dark:text-violet-400 hover:opacity-80 transition">
                全実績を見る →
              </Link>
            </div>
          </div>

          {/* Quick Nav */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "グラフを見る", href: "/charts", emoji: "📊" },
              { label: "目標を設定", href: "/goals", emoji: "🎯" },
              { label: "実績を確認", href: "/achievements", emoji: "🏆" },
              { label: "カテゴリー管理", href: "/categories", emoji: "🏷️" },
            ].map(({ label, href, emoji }) => (
              <Link
                key={href}
                href={href}
                className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-violet-300 dark:hover:border-violet-500/30 transition text-center"
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-xs text-gray-600 dark:text-white/60">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <MobileTabBar />
    </div>
  );
}

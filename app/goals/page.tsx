"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { Header } from "@/components/layout/Header";
import { useGoals, useStreak, useGoalHistory } from "@/hooks/useGoals";
import { useCategories } from "@/hooks/useCategories";
import { useToast } from "@/components/ui/Toast";
import { Goal } from "@/types/database";
import { Trash2, Plus, X, Flame } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export default function GoalsPage() {
  const { user, loading, session } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { goals, mutate } = useGoals();
  const { streak } = useStreak();
  const { categories } = useCategories();
  const [historyView, setHistoryView] = useState<"daily" | "weekly" | "monthly">("daily");
  const { history } = useGoalHistory(historyView);

  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<"daily" | "period">("daily");
  const [categoryId, setCategoryId] = useState("overall");
  const [targetHours, setTargetHours] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  const activeCategories = categories.filter((c) => !c.is_archived);

  const handleAdd = async () => {
    if (!targetHours || isNaN(parseFloat(targetHours))) {
      toast("目標時間を入力してください", "error"); return;
    }
    if (type === "period" && !deadline) {
      toast("期日を設定してください", "error"); return;
    }
    setSaving(true);
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        category_id: categoryId === "overall" ? null : categoryId,
        type,
        target_hours: parseFloat(targetHours),
        deadline: type === "period" ? new Date(deadline).toISOString() : null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast("目標を追加しました", "success");
      mutate();
      setShowForm(false); setTargetHours(""); setDeadline("");
    } else {
      const d = await res.json();
      toast(d.error ?? "失敗しました", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この目標を削除しますか？")) return;
    await fetch(`/api/goals/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    toast("削除しました", "success");
    mutate();
  };

  const getCatName = (goal: Goal) => {
    if (!goal.category_id) return "全カテゴリー合計";
    return categories.find((c) => c.id === goal.category_id)?.name ?? "不明";
  };

  if (loading || !user) return null;

  const dailyGoals = goals.filter((g) => g.type === "daily");
  const periodGoals = goals.filter((g) => g.type === "period");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-hide pb-20 lg:pb-0">
        <Header title="目標" />
        <div className="px-4 lg:px-8 py-6 space-y-6 max-w-4xl">

          {/* Streak */}
          <div className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Flame className="w-8 h-8 text-orange-500" />
              <span className="text-4xl font-bold font-mono text-orange-500">{streak?.currentStreak ?? 0}</span>
            </div>
            <div>
              <div className="text-sm font-medium">連続達成日数</div>
              <div className="text-xs text-gray-400 dark:text-white/30">最長: {streak?.longestStreak ?? 0}日</div>
            </div>
          </div>

          {/* Add Goal Form */}
          {showForm ? (
            <div className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-gray-500 dark:text-white/50 uppercase tracking-wider">新しい目標</h2>
                <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
              </div>
              <div className="space-y-4">
                {/* Type */}
                <div className="flex gap-1 bg-gray-100 dark:bg-white/[0.04] rounded-xl p-1">
                  {(["daily", "period"] as const).map((t) => (
                    <button key={t} onClick={() => setType(t)}
                      className={cn("flex-1 py-1.5 rounded-lg text-xs font-medium transition", type === t ? "bg-white dark:bg-[#1e1e2e] shadow text-gray-900 dark:text-white" : "text-gray-500 dark:text-white/50")}>
                      {t === "daily" ? "デイリー" : "期間"}
                    </button>
                  ))}
                </div>
                {/* Category */}
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-500 transition">
                  <option value="overall">全カテゴリー合計</option>
                  {activeCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {/* Target hours */}
                <div className="relative">
                  <input type="number" min="0.5" max="24" step="0.5" value={targetHours}
                    onChange={(e) => setTargetHours(e.target.value)} placeholder="目標時間"
                    className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition pr-12" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-white/30">時間</span>
                </div>
                {/* Deadline for period */}
                {type === "period" && (
                  <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition" />
                )}
                <div className="flex gap-3">
                  <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/[0.06] text-sm text-gray-500 hover:bg-gray-50 transition">キャンセル</button>
                  <button onClick={handleAdd} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium transition disabled:opacity-50">
                    {saving ? "追加中..." : "追加"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowForm(true)}
              className="w-full flex items-center gap-2 justify-center py-3 rounded-2xl border-2 border-dashed border-gray-300 dark:border-white/[0.1] text-gray-500 dark:text-white/40 hover:border-violet-400 hover:text-violet-600 transition text-sm">
              <Plus className="w-4 h-4" />目標を追加
            </button>
          )}

          {/* Daily Goals */}
          {dailyGoals.length > 0 && (
            <div className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-white/[0.06]">
                <h2 className="text-sm font-medium text-gray-500 dark:text-white/50 uppercase tracking-wider">デイリー目標</h2>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                {dailyGoals.map((g) => (
                  <div key={g.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{getCatName(g)}</div>
                      <div className="text-xs text-gray-400 dark:text-white/40">{g.target_hours}時間/日</div>
                    </div>
                    <button onClick={() => handleDelete(g.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Period Goals */}
          {periodGoals.length > 0 && (
            <div className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-white/[0.06]">
                <h2 className="text-sm font-medium text-gray-500 dark:text-white/50 uppercase tracking-wider">期間目標</h2>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                {periodGoals.map((g) => (
                  <div key={g.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{getCatName(g)}</div>
                      <div className="text-xs text-gray-400 dark:text-white/40">
                        {g.target_hours}時間 | 期日: {g.deadline ? new Date(g.deadline).toLocaleDateString("ja-JP") : "なし"}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(g.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Achievement History */}
          <div className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-500 dark:text-white/50 uppercase tracking-wider">達成率</h2>
              <div className="flex gap-1">
                {(["daily", "weekly", "monthly"] as const).map((v) => (
                  <button key={v} onClick={() => setHistoryView(v)}
                    className={cn("px-2.5 py-1 rounded-lg text-xs transition", historyView === v ? "bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400" : "text-gray-400 dark:text-white/30 hover:text-gray-600")}>
                    {v === "daily" ? "日" : v === "weekly" ? "週" : "月"}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-6 py-4">
              {history ? (
                <div className="space-y-2">
                  {(historyView === "daily" ? history.daily.slice(-14).reverse() : historyView === "weekly" ? [...history.weekly].reverse() : [...history.monthly].reverse()).map((item, i) => {
                    const label = "date" in item ? item.date : "week" in item ? item.week : item.month;
                    const rate = item.rate;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 dark:text-white/30 w-20 flex-shrink-0">{label}</span>
                        <div className="flex-1 h-2 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${rate * 100}%`, backgroundColor: rate >= 1 ? "#22c55e" : "#8b5cf6" }} />
                        </div>
                        <span className="text-xs font-mono text-gray-600 dark:text-white/60 w-10 text-right">{Math.round(rate * 100)}%</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-white/30 text-center py-4">データを読み込み中...</p>
              )}
            </div>
          </div>
        </div>
      </main>
      <MobileTabBar />
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { Header } from "@/components/layout/Header";
import { RecordForm } from "@/components/records/RecordForm";
import { useToast } from "@/components/ui/Toast";
import { Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { RecordWithCategory } from "@/types/database";
import { cn } from "@/lib/utils/cn";

type Period = "day" | "week" | "month";
type DurationMode = "h" | "hm";

function getLocalDateStr(d: Date): string {
  return d.toLocaleDateString("sv"); // "YYYY-MM-DD" in local timezone
}

function getPeriodRange(period: Period, offset: number): { start: string; end: string; label: string } {
  const now = new Date();

  if (period === "day") {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    const dateStr = getLocalDateStr(d);
    return {
      start: new Date(`${dateStr}T00:00:00`).toISOString(),
      end: new Date(`${dateStr}T23:59:59`).toISOString(),
      label: d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" }),
    };
  }

  if (period === "week") {
    const d = new Date(now);
    const dayOfWeek = d.getDay(); // 0=Sun
    const mondayDiff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    d.setDate(d.getDate() + mondayDiff + offset * 7);
    const mon = new Date(d);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return {
      start: new Date(`${getLocalDateStr(mon)}T00:00:00`).toISOString(),
      end: new Date(`${getLocalDateStr(sun)}T23:59:59`).toISOString(),
      label: `${mon.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })} 〜 ${sun.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}`,
    };
  }

  // month
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return {
    start: new Date(`${getLocalDateStr(d)}T00:00:00`).toISOString(),
    end: new Date(`${getLocalDateStr(last)}T23:59:59`).toISOString(),
    label: d.toLocaleDateString("ja-JP", { year: "numeric", month: "long" }),
  };
}

function formatDuration(ms: number, mode: DurationMode): string {
  if (mode === "h") return `${(ms / 3_600_000).toFixed(1)}h`;
  const totalMin = Math.round(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}

export default function RecordsPage() {
  const { user, loading, session } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [records, setRecords] = useState<RecordWithCategory[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [period, setPeriod] = useState<Period>("day");
  const [offset, setOffset] = useState(0);
  const [durationMode, setDurationMode] = useState<DurationMode>("h");
  const [editingRecord, setEditingRecord] = useState<RecordWithCategory | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  const fetchRecords = useCallback(() => {
    if (!session?.access_token) return;
    const { start, end } = getPeriodRange(period, offset);
    setLoadingRecords(true);
    fetch(`/api/records?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&limit=500`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((data) => { setRecords(Array.isArray(data) ? data : []); setLoadingRecords(false); })
      .catch(() => setLoadingRecords(false));
  }, [session?.access_token, period, offset]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleDelete = async (id: string) => {
    if (!confirm("この記録を削除しますか？")) return;
    const res = await fetch(`/api/records/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.ok) {
      toast("記録を削除しました", "success");
      fetchRecords();
    } else {
      toast("削除に失敗しました", "error");
    }
  };

  if (loading || !user) return null;

  const { label } = getPeriodRange(period, offset);
  const totalMs = records.reduce(
    (sum, r) => sum + (new Date(r.end_time).getTime() - new Date(r.start_time).getTime()),
    0
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-hide pb-20 lg:pb-0">
        <Header title="記録" />
        <div className="px-4 lg:px-8 py-6 space-y-6 max-w-4xl">
          <div ref={formRef}>
            <RecordForm
              onSaved={fetchRecords}
              editRecord={editingRecord}
              onCancel={() => setEditingRecord(null)}
            />
          </div>

          {/* Records List */}
          <div className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/[0.06] space-y-3">
              {/* Period tabs + duration toggle */}
              <div className="flex items-center gap-2">
                <div className="flex gap-1 bg-gray-100 dark:bg-white/[0.04] rounded-xl p-1">
                  {(["day", "week", "month"] as Period[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => { setPeriod(p); setOffset(0); }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition",
                        period === p
                          ? "bg-white dark:bg-[#1e1e2e] shadow text-gray-900 dark:text-white"
                          : "text-gray-500 dark:text-white/50"
                      )}
                    >
                      {p === "day" ? "日" : p === "week" ? "週" : "月"}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setDurationMode((m) => (m === "h" ? "hm" : "h"))}
                  className="ml-auto text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.06] text-gray-500 dark:text-white/40 hover:border-violet-400 hover:text-violet-500 dark:hover:text-violet-400 transition font-mono"
                >
                  {durationMode === "h" ? "1.5h" : "1h30m"}
                </button>
              </div>

              {/* Period navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOffset((o) => o - 1)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.04] text-gray-400 dark:text-white/30 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="flex-1 text-center text-sm font-medium">{label}</span>
                <button
                  onClick={() => setOffset((o) => Math.min(0, o + 1))}
                  disabled={offset === 0}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.04] text-gray-400 dark:text-white/30 transition disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Summary */}
              {!loadingRecords && records.length > 0 && (
                <div className="text-xs text-gray-400 dark:text-white/30 text-right">
                  合計{" "}
                  <span className="font-mono text-gray-600 dark:text-white/60">{formatDuration(totalMs, durationMode)}</span>
                  <span className="ml-2">({records.length}件)</span>
                </div>
              )}
            </div>

            {loadingRecords ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-gray-100 dark:bg-white/[0.04] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="p-12 text-center text-gray-400 dark:text-white/30">
                <p className="text-4xl mb-3">📝</p>
                <p className="text-sm">この期間の記録がありません</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
                {records.map((r) => {
                  const start = new Date(r.start_time);
                  const end = new Date(r.end_time);
                  const ms = end.getTime() - start.getTime();
                  const cat = r.categories;
                  return (
                    <div
                      key={r.id}
                      onDoubleClick={() => { setEditingRecord(r); setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0); }}
                      className={cn(
                        "flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition cursor-pointer",
                        editingRecord?.id === r.id && "bg-red-50 dark:bg-red-500/10"
                      )}
                    >
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat?.color ?? "#888" }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{cat?.name ?? "不明"}</div>
                        <div className="text-xs text-gray-400 dark:text-white/40">
                          {start.toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          {" 〜 "}
                          {end.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <span className="text-sm font-mono text-gray-600 dark:text-white/70">{formatDuration(ms, durationMode)}</span>
                      {editingRecord?.id === r.id && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400 flex-shrink-0">
                          編集中
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                        className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 text-gray-400 dark:text-white/30 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
      <MobileTabBar />
    </div>
  );
}

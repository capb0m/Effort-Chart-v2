"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { Header } from "@/components/layout/Header";
import { StackedAreaChart } from "@/components/charts/StackedAreaChart";
import { TimelineDonutChart } from "@/components/charts/TimelineDonutChart";
import { cn } from "@/lib/utils/cn";
import { format, subDays } from "date-fns";
import { History, ChevronDown, ChevronUp, X } from "lucide-react";

type ChartMode = "period" | "cumulative";
type PeriodPreset = "week" | "month" | "3month";

export default function ChartsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [chartMode, setChartMode] = useState<ChartMode>("period");
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("week");
  const [timelineDate, setTimelineDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [extendedStart, setExtendedStart] = useState<string | null>(null);
  const [showExtendBox, setShowExtendBox] = useState(false);
  const [customFrom, setCustomFrom] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  if (loading || !user) return null;

  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const days = periodPreset === "week" ? 7 : periodPreset === "month" ? 30 : 90;
  const periodStart = format(subDays(now, days - 1), "yyyy-MM-dd");

  // extendedStart が設定されている場合はそこから、なければ通常の範囲
  const chartStart = extendedStart
    ? extendedStart
    : chartMode === "period"
      ? format(subDays(now, 89), "yyyy-MM-dd")
      : periodStart;

  const handleExtend = () => {
    if (!customFrom) return;
    setExtendedStart(customFrom);
    setShowExtendBox(false);
  };

  const handleReset = () => {
    setExtendedStart(null);
    setCustomFrom("");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-hide pb-20 lg:pb-0">
        <Header title="グラフ" />
        <div className="px-4 lg:px-8 py-6 space-y-6 max-w-6xl">

          {/* Controls */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-1 bg-gray-100 dark:bg-white/[0.04] rounded-xl p-1">
              {(["period", "cumulative"] as const).map((m) => (
                <button key={m} onClick={() => setChartMode(m)}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition", chartMode === m ? "bg-white dark:bg-[#1e1e2e] shadow text-gray-900 dark:text-white" : "text-gray-500 dark:text-white/50")}>
                  {m === "period" ? "期間" : "累積"}
                </button>
              ))}
            </div>
            <div className="flex gap-1 bg-gray-100 dark:bg-white/[0.04] rounded-xl p-1">
              {([["week", "1週間"], ["month", "1ヶ月"], ["3month", "3ヶ月"]] as [PeriodPreset, string][]).map(([p, label]) => (
                <button key={p} onClick={() => setPeriodPreset(p)}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition", periodPreset === p ? "bg-white dark:bg-[#1e1e2e] shadow text-gray-900 dark:text-white" : "text-gray-500 dark:text-white/50")}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Stacked Area Chart */}
          <div className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6">
            <h2 className="text-sm font-medium text-gray-500 dark:text-white/50 uppercase tracking-wider mb-4">
              活動グラフ
            </h2>
            <StackedAreaChart mode={chartMode} start={chartStart} end={today} windowSize={days} />

            {/* 古い記録取得 */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/[0.04]">
              <button
                onClick={() => setShowExtendBox(!showExtendBox)}
                className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-white/30 hover:text-violet-500 dark:hover:text-violet-400 transition"
              >
                <History className="w-3.5 h-3.5" />
                さらに古い記録を取得
                {extendedStart && (
                  <span className="text-violet-500 dark:text-violet-400 ml-1">({extendedStart} 〜)</span>
                )}
                {showExtendBox ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showExtendBox && (
                <div className="mt-3 p-4 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-white/40 mb-3">
                    取得する期間の開始日を選択してください。現在日までのデータがグラフに追加されます。
                  </p>
                  <div className="flex flex-wrap gap-2 items-end">
                    <div>
                      <label className="text-xs text-gray-500 dark:text-white/40 mb-1 block">開始日</label>
                      <input
                        type="date"
                        value={customFrom}
                        max={format(subDays(now, 1), "yyyy-MM-dd")}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="bg-white dark:bg-[#1e1e2e] border border-gray-200 dark:border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
                      />
                    </div>
                    <button
                      disabled={!customFrom}
                      onClick={handleExtend}
                      className="px-3 py-1.5 bg-violet-500 text-white text-xs rounded-lg hover:bg-violet-600 transition disabled:opacity-50"
                    >
                      取得
                    </button>
                    {extendedStart && (
                      <button
                        onClick={handleReset}
                        className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-white/[0.06] text-gray-500 dark:text-white/40 text-xs rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.03] transition"
                      >
                        <X className="w-3 h-3" />
                        リセット
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timeline Donut */}
          <div className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-500 dark:text-white/50 uppercase tracking-wider">
                24時間タイムライン
              </h2>
              <input
                type="date"
                value={timelineDate}
                onChange={(e) => setTimelineDate(e.target.value)}
                className="text-xs bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-lg px-2 py-1 focus:outline-none"
              />
            </div>
            <TimelineDonutChart date={timelineDate} />
          </div>
        </div>
      </main>
      <MobileTabBar />
    </div>
  );
}

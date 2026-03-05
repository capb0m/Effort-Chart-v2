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

type ChartMode = "period" | "cumulative";
type PeriodPreset = "week" | "month" | "3month";

export default function ChartsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [chartMode, setChartMode] = useState<ChartMode>("period");
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("week");
  const [timelineDate, setTimelineDate] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  // 常に90日分ロードし、windowSize でグラフの表示幅を制御する
  const getRange = () => {
    const now = new Date();
    return { start: format(subDays(now, 89), "yyyy-MM-dd"), end: format(now, "yyyy-MM-dd") };
  };

  const windowSize = periodPreset === "week" ? 7 : periodPreset === "month" ? 30 : 90;

  if (loading || !user) return null;

  const { start, end } = getRange();

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
            <StackedAreaChart mode={chartMode} start={start} end={end} windowSize={chartMode === "cumulative" ? 90 : windowSize} />
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

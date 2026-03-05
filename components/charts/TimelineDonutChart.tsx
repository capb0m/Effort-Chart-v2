"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { TimelineChartData } from "@/types/database";

interface TimelineDonutChartProps {
  date: string;
}

export function TimelineDonutChart({ date }: TimelineDonutChartProps) {
  const { session } = useAuth();
  const { resolvedTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<import("chart.js").Chart | null>(null);
  const [data, setData] = useState<TimelineChartData | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    fetch(`/api/charts/timeline?date=${date}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((json) => { if (json && json.segments) setData(json); })
      .catch(console.error);
  }, [session?.access_token, date]);

  useEffect(() => {
    if (!data || !canvasRef.current) return;

    const initChart = async () => {
      const { Chart, DoughnutController, ArcElement, Tooltip, Legend } = await import("chart.js");
      Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

      chartRef.current?.destroy();
      chartRef.current = null;

      const isDark = resolvedTheme === "dark";
      const textColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)";

      if (data.segments.length === 0) {
        // Empty chart
        chartRef.current = new Chart(canvasRef.current!, {
          type: "doughnut",
          data: {
            labels: ["記録なし"],
            datasets: [{ data: [24], backgroundColor: [isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"] }],
          },
          options: { plugins: { legend: { display: false }, tooltip: { enabled: false } }, cutout: "70%" },
        });
        return;
      }

      const labels = data.segments.map((s) => s.categoryName);
      const hours = data.segments.map((s) => s.hours);
      const colors = data.segments.map((s) => s.color);

      // 空き時間を追加
      const totalFree = 24 - data.totalHours;
      if (totalFree > 0) {
        labels.push("未記録");
        hours.push(totalFree);
        colors.push(isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)");
      }

      chartRef.current = new Chart(canvasRef.current!, {
        type: "doughnut",
        data: { labels, datasets: [{ data: hours, backgroundColor: colors, borderWidth: 1 }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "70%",
          plugins: {
            legend: {
              position: "right",
              labels: { color: textColor, font: { size: 11 }, padding: 12, boxWidth: 10 },
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${(ctx.parsed as number).toFixed(1)}h`,
              },
            },
          },
        },
      });
    };

    initChart().catch(console.error);
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data, resolvedTheme]);

  return (
    <div className="relative h-64">
      <canvas ref={canvasRef} className="w-full h-full" />
      {!data ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center" style={{ transform: "translateX(-30%)" }}>
            <div className="text-2xl font-bold font-mono">{data.totalHours.toFixed(1)}h</div>
            <div className="text-xs text-gray-400 dark:text-white/30">合計</div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { StackedChartData } from "@/types/database";
import { useWhatPulse } from "@/hooks/useWhatPulse";

interface StackedAreaChartProps {
  mode: "period" | "cumulative";
  start: string;
  end: string;
}

export function StackedAreaChart({ mode, start, end }: StackedAreaChartProps) {
  const { session } = useAuth();
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<import("chart.js").Chart | null>(null);
  const [data, setData] = useState<StackedChartData | null>(null);
  const { whatpulse } = useWhatPulse();

  useEffect(() => {
    if (!session?.access_token) return;
    fetch(`/api/charts/stacked?mode=${mode}&start=${start}&end=${end}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, [session?.access_token, mode, start, end]);

  useEffect(() => {
    if (!data || !canvasRef.current) return;

    const initChart = async () => {
      const { Chart, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend } = await import("chart.js");
      const { default: annotationPlugin } = await import("chartjs-plugin-annotation");
      const { default: zoomPlugin } = await import("chartjs-plugin-zoom");

      Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend, annotationPlugin, zoomPlugin);

      chartRef.current?.destroy();

      const isDark = theme === "dark";
      const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
      const textColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)";

      // 全体デイリー目標ライン（破線）
      const annotations: Record<string, object> = {};
      if (data.overallGoal && mode === "period") {
        annotations["overallGoalLine"] = {
          type: "line",
          yMin: data.overallGoal,
          yMax: data.overallGoal,
          borderColor: gridColor.replace("0.06", "0.4"),
          borderWidth: 2,
          borderDash: [6, 4],
          label: {
            display: true,
            content: `目標 ${data.overallGoal}h`,
            position: "end",
            color: textColor,
            font: { size: 10 },
          },
        };
      }

      chartRef.current = new Chart(canvasRef.current!, {
        type: "line",
        data: {
          labels: data.labels,
          datasets: data.datasets.map((ds) => ({
            label: ds.label,
            data: ds.data,
            backgroundColor: ds.backgroundColor,
            borderColor: ds.borderColor,
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: data.labels.length > 30 ? 0 : 3,
          })),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: {
              position: "bottom",
              labels: { color: textColor, boxWidth: 12, padding: 16, font: { size: 11 } },
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ${(ctx.parsed.y as number).toFixed(1)}h`,
              },
            },
            annotation: { annotations },
            zoom: {
              pan: { enabled: true, mode: "x" },
              zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
            },
          },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } } },
            y: {
              stacked: true,
              grid: { color: gridColor },
              ticks: { color: textColor, font: { size: 11 }, callback: (v) => `${v}h` },
            },
          },
        },
      });
    };

    initChart();
    return () => { chartRef.current?.destroy(); };
  }, [data, theme, mode]);

  return (
    <div className="relative h-72">
      {!data ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <canvas ref={canvasRef} />
      )}
    </div>
  );
}

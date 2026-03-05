"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { StackedChartData } from "@/types/database";

interface StackedAreaChartProps {
  mode: "period" | "cumulative";
  start: string;
  end: string;
}

export function StackedAreaChart({ mode, start, end }: StackedAreaChartProps) {
  const { session } = useAuth();
  const { resolvedTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<import("chart.js").Chart | null>(null);
  const [data, setData] = useState<StackedChartData | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    fetch(`/api/charts/stacked?mode=${mode}&start=${start}&end=${end}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((json) => { if (json && json.labels) setData(json); })
      .catch(console.error);
  }, [session?.access_token, mode, start, end]);

  useEffect(() => {
    if (!data || !canvasRef.current) return;

    const initChart = async () => {
      const { Chart, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend } = await import("chart.js");

      // オプショナルプラグイン（失敗しても描画を続ける）
      let annotationPlugin: any = null;
      let zoomPlugin: any = null;
      try {
        annotationPlugin = (await import("chartjs-plugin-annotation")).default;
      } catch { /* optional */ }
      try {
        zoomPlugin = (await import("chartjs-plugin-zoom")).default;
      } catch { /* optional */ }

      const toRegister: any[] = [CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend];
      if (annotationPlugin) toRegister.push(annotationPlugin);
      if (zoomPlugin) toRegister.push(zoomPlugin);
      Chart.register(...toRegister);

      chartRef.current?.destroy();
      chartRef.current = null;

      if (!canvasRef.current) return;

      const isDark = resolvedTheme === "dark";
      const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
      const textColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)";

      const annotations: Record<string, object> = {};
      if (annotationPlugin && data.overallGoal && mode === "period") {
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

      const pluginOptions: Record<string, any> = {
        legend: {
          position: "bottom",
          labels: { color: textColor, boxWidth: 12, padding: 16, font: { size: 11 } },
        },
        tooltip: {
          callbacks: {
            label: (ctx: any) => ` ${ctx.dataset.label}: ${(ctx.parsed.y as number).toFixed(1)}h`,
          },
        },
      };
      if (annotationPlugin) pluginOptions["annotation"] = { annotations };
      if (zoomPlugin) pluginOptions["zoom"] = {
        pan: { enabled: true, mode: "x" },
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
      };

      chartRef.current = new Chart(canvasRef.current, {
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
          plugins: pluginOptions,
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } } },
            y: {
              stacked: true,
              grid: { color: gridColor },
              ticks: { color: textColor, font: { size: 11 }, callback: (v: any) => `${v}h` },
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
  }, [data, resolvedTheme, mode]);

  return (
    <div className="relative h-72">
      <canvas ref={canvasRef} className="w-full h-full" />
      {!data && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      )}
    </div>
  );
}

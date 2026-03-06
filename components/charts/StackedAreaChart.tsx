"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { StackedChartData } from "@/types/database";

interface StackedAreaChartProps {
  mode: "period" | "cumulative";
  start: string;
  end: string;
  windowSize?: number; // 期間モード: 表示幅（90日ロードのうち何日表示するか）/ 累積モード: 未使用
}

export function StackedAreaChart({ mode, start, end, windowSize = 90 }: StackedAreaChartProps) {
  const { session } = useAuth();
  const { resolvedTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<import("chart.js").Chart | null>(null);
  const [data, setData] = useState<StackedChartData | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    setData(null);
    setChartError(null);
    const tz = -new Date().getTimezoneOffset(); // UTC+X の分数（例: JST=540）
    fetch(`/api/charts/stacked?mode=${mode}&start=${start}&end=${end}&tz=${tz}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json && json.labels) {
          setData(json);
        } else {
          setChartError(json?.error ?? "データの取得に失敗しました");
        }
      })
      .catch((e) => setChartError(String(e)));
  }, [session?.access_token, mode, start, end]);

  useEffect(() => {
    if (!data || !canvasRef.current) return;

    let cancelled = false;

    const initChart = async () => {
      try {
        const { Chart, LineController, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend } = await import("chart.js");
        if (cancelled) return;

        let annotationPlugin: any = null;
        let zoomPlugin: any = null;
        try { annotationPlugin = (await import("chartjs-plugin-annotation")).default; } catch { /* optional */ }
        try { zoomPlugin = (await import("chartjs-plugin-zoom")).default; } catch { /* optional */ }

        if (cancelled) return;

        const toRegister: any[] = [LineController, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend];
        if (annotationPlugin) toRegister.push(annotationPlugin);
        if (zoomPlugin) toRegister.push(zoomPlugin);
        Chart.register(...toRegister);

        chartRef.current?.destroy();
        chartRef.current = null;
        if (cancelled || !canvasRef.current) return;

        const isDark = resolvedTheme === "dark";
        const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
        const textColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)";

        // WhatPulse キータイプ右軸
        const hasKeypress = !!(data.keypressData?.some((v) => v > 0));
        const maxKeys = hasKeypress ? Math.max(...(data.keypressData!)) : 0;

        // 期間モード: 90日データのうち windowSize 分だけ初期表示してドラッグ移動可能
        const canPan = mode === "period" && windowSize < data.labels.length;
        const xMin = canPan ? data.labels[data.labels.length - windowSize] : undefined;
        const xMax = data.labels[data.labels.length - 1];

        // 目標破線（期間モードのみ）
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
              label: (ctx: any) => {
                if (ctx.dataset.yAxisID === "y1") {
                  return ` キータイプ数: ${Math.round(ctx.parsed.y).toLocaleString()}`;
                }
                return ` ${ctx.dataset.label}: ${(ctx.parsed.y as number).toFixed(1)}h`;
              },
            },
          },
        };
        if (annotationPlugin) pluginOptions["annotation"] = { annotations };
        if (zoomPlugin) {
          pluginOptions["zoom"] = {
            pan: { enabled: true, mode: "x" },
            zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
            limits: {
              x: {
                min: data.labels[0],
                max: xMax,
                minRange: Math.min(7, data.labels.length),
              },
            },
          };
        }

        // データセット
        const chartDatasets: any[] = data.datasets.map((ds) => ({
          label: ds.label,
          data: ds.data,
          backgroundColor: ds.backgroundColor,
          borderColor: ds.borderColor,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: windowSize <= 30 ? 3 : 0,
          yAxisID: "y",
        }));
        if (hasKeypress) {
          chartDatasets.push({
            label: "キータイプ数",
            data: data.keypressData!,
            borderColor: "#a855f7",
            backgroundColor: "rgba(168,85,247,0.08)",
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            yAxisID: "y1",
            order: -1,
          });
        }

        // スケール
        const scales: any = {
          x: {
            min: xMin,
            max: xMax,
            grid: { color: gridColor },
            ticks: { color: textColor, font: { size: 11 } },
          },
          y: {
            stacked: true,
            grid: { color: gridColor },
            ticks: { color: textColor, font: { size: 11 }, callback: (v: any) => `${v}h` },
          },
        };
        if (hasKeypress) {
          scales.y1 = {
            position: "right",
            grid: { drawOnChartArea: false },
            max: Math.ceil(maxKeys * 1.2),
            ticks: {
              color: "#a855f7",
              font: { size: 11 },
              callback: (v: any) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`,
            },
          };
        }

        chartRef.current = new Chart(canvasRef.current, {
          type: "line",
          data: { labels: data.labels, datasets: chartDatasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: pluginOptions,
            scales,
          },
        });
      } catch (e: any) {
        if (!cancelled) setChartError(e?.message ?? String(e));
      }
    };

    initChart();
    return () => {
      cancelled = true;
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data, resolvedTheme, mode, windowSize]);

  return (
    <div className="relative h-72">
      <canvas ref={canvasRef} className="w-full h-full" />
      {!data && !chartError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        </div>
      )}
      {chartError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xs text-red-400 px-4 text-center">{chartError}</p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { TimelineChartData } from "@/types/database";

interface TimelineDonutChartProps {
  date: string;
}

// 角丸矩形を描画するヘルパー
function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

export function TimelineDonutChart({ date }: TimelineDonutChartProps) {
  const { session } = useAuth();
  const { resolvedTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  // Canvas描画
  useEffect(() => {
    if (!data || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;

    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    ctx.scale(dpr, dpr);

    const isDark = resolvedTheme === "dark";
    const bg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)";
    const tickColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
    const labelColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.45)";

    const BAR_Y = 0;
    const BAR_H = 44;
    const TICK_Y = BAR_H + 2;
    const TICK_H = 6;
    const LABEL_Y = BAR_H + 18;
    const RADIUS = 6;

    ctx.clearRect(0, 0, cssWidth, cssHeight);

    // 背景バー
    ctx.fillStyle = bg;
    fillRoundedRect(ctx, 0, BAR_Y, cssWidth, BAR_H, RADIUS);

    // 活動セグメントをクリッピング内に描画
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(RADIUS, BAR_Y);
    ctx.arcTo(cssWidth, BAR_Y, cssWidth, BAR_Y + BAR_H, RADIUS);
    ctx.arcTo(cssWidth, BAR_Y + BAR_H, 0, BAR_Y + BAR_H, RADIUS);
    ctx.arcTo(0, BAR_Y + BAR_H, 0, BAR_Y, RADIUS);
    ctx.arcTo(0, BAR_Y, cssWidth, BAR_Y, RADIUS);
    ctx.closePath();
    ctx.clip();

    // 各セグメントを描画（ローカル時刻で位置計算）
    const dayStart = new Date(date + "T00:00:00").getTime();
    const dayMs = 24 * 3600 * 1000;

    for (const seg of data.segments) {
      const startMs = new Date(seg.startTime).getTime() - dayStart;
      const endMs = new Date(seg.endTime).getTime() - dayStart;
      const x1 = Math.max(0, (startMs / dayMs) * cssWidth);
      const x2 = Math.min(cssWidth, (endMs / dayMs) * cssWidth);
      if (x2 <= x1) continue;

      ctx.fillStyle = seg.color;
      ctx.fillRect(x1, BAR_Y, x2 - x1, BAR_H);
    }

    ctx.restore();

    // 時刻ティックとラベル（0, 4, 8, 12, 16, 20, 24）
    ctx.font = `10px system-ui, sans-serif`;
    ctx.textAlign = "center";

    for (let h = 0; h <= 24; h += 4) {
      const x = (h / 24) * cssWidth;

      // ティック
      ctx.fillStyle = tickColor;
      ctx.fillRect(x - 0.5, TICK_Y, 1, TICK_H);

      // ラベル
      ctx.fillStyle = labelColor;
      const label = h === 0 ? "0時" : h === 24 ? "" : `${h}時`;
      ctx.fillText(label, x, LABEL_Y);
    }
  }, [data, resolvedTheme, date]);

  // ユニークカテゴリ（凡例用）
  const uniqueCategories = data
    ? data.segments.reduce<{ categoryId: string; categoryName: string; color: string }[]>(
        (acc, seg) => {
          if (!acc.some((c) => c.categoryId === seg.categoryId)) {
            acc.push({ categoryId: seg.categoryId, categoryName: seg.categoryName, color: seg.color });
          }
          return acc;
        },
        []
      )
    : [];

  return (
    <div className="space-y-4">
      {/* タイムラインバー */}
      <div className="relative" style={{ height: 68 }}>
        <canvas ref={canvasRef} className="w-full h-full" />
        {!data && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          </div>
        )}
      </div>

      {/* 合計時間 + 凡例 */}
      {data && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-sm font-mono font-semibold text-gray-700 dark:text-white/70">
            合計 {data.totalHours.toFixed(1)}h
          </span>
          {uniqueCategories.map((cat) => (
            <div key={cat.categoryId} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <span className="text-xs text-gray-600 dark:text-white/50">{cat.categoryName}</span>
            </div>
          ))}
          {data.segments.length === 0 && (
            <span className="text-xs text-gray-400 dark:text-white/30">この日の記録はありません</span>
          )}
        </div>
      )}
    </div>
  );
}

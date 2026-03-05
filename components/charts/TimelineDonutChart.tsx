"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { TimelineChartData } from "@/types/database";

interface TimelineDonutChartProps {
  date: string;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  categoryName: string;
  color: string;
  startLabel: string;
  endLabel: string;
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function TimelineDonutChart({ date }: TimelineDonutChartProps) {
  const { session } = useAuth();
  const { resolvedTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<TimelineChartData | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, categoryName: "", color: "", startLabel: "", endLabel: "",
  });

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
    const cssSize = Math.min(canvas.clientWidth, canvas.clientHeight);

    canvas.width = cssSize * dpr;
    canvas.height = cssSize * dpr;
    ctx.scale(dpr, dpr);

    const isDark = resolvedTheme === "dark";
    const bgRing = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
    const tickColor = isDark ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.18)";
    const labelColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.50)";

    const cx = cssSize / 2;
    const cy = cssSize / 2;
    const outerR = cssSize * 0.44;
    const innerR = cssSize * 0.30;
    const tickOuterR = outerR + 5;
    const tickInnerR = outerR + 1;
    const labelR = outerR + 14;

    ctx.clearRect(0, 0, cssSize, cssSize);

    // 背景リング
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
    ctx.fillStyle = bgRing;
    ctx.fill("evenodd");

    // 各セグメントを描画
    for (const seg of data.segments) {
      const startAngle = timeToAngle(seg.startTime);
      const endAngle = timeToAngle(seg.endTime);
      if (endAngle <= startAngle) continue;

      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, endAngle);
      ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
    }

    // 時刻ティックとラベル（0, 3, 6, 9, 12, 15, 18, 21）
    ctx.font = `${Math.max(9, cssSize * 0.055)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let h = 0; h < 24; h += 3) {
      const angle = (h / 24) * Math.PI * 2 - Math.PI / 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      ctx.strokeStyle = tickColor;
      ctx.lineWidth = h % 6 === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + cos * tickInnerR, cy + sin * tickInnerR);
      ctx.lineTo(cx + cos * tickOuterR, cy + sin * tickOuterR);
      ctx.stroke();

      ctx.fillStyle = labelColor;
      ctx.fillText(`${h}`, cx + cos * labelR, cy + sin * labelR);
    }

    // 中央に合計時間
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.75)";
    ctx.font = `bold ${Math.max(14, cssSize * 0.10)}px system-ui, sans-serif`;
    ctx.fillText(`${data.totalHours.toFixed(1)}h`, cx, cy - cssSize * 0.04);
    ctx.font = `${Math.max(9, cssSize * 0.055)}px system-ui, sans-serif`;
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.40)";
    ctx.fillText("合計", cx, cy + cssSize * 0.06);
  }, [data, resolvedTheme, date]);

  // マウスホバー処理
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!data || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const cssSize = Math.min(canvas.clientWidth, canvas.clientHeight);
    const cx = cssSize / 2;
    const cy = cssSize / 2;
    const outerR = cssSize * 0.44;
    const innerR = cssSize * 0.30;

    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const dx = mx - cx;
    const dy = my - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < innerR || dist > outerR) {
      setTooltip((t) => ({ ...t, visible: false }));
      return;
    }

    // ドーナツ内の角度から時刻を計算
    const angle = Math.atan2(dy, dx); // -π to π
    const normalizedAngle = ((angle + Math.PI / 2) + Math.PI * 2) % (Math.PI * 2);
    const hour = (normalizedAngle / (Math.PI * 2)) * 24;

    // どのセグメントに属するか判定
    const hit = data.segments.find((seg) => {
      const d = new Date(seg.startTime);
      const startH = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
      const d2 = new Date(seg.endTime);
      const endH = d2.getHours() + d2.getMinutes() / 60 + d2.getSeconds() / 3600;
      return hour >= startH && hour <= endH;
    });

    if (!hit) {
      setTooltip((t) => ({ ...t, visible: false }));
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: e.clientX - containerRect.left,
      y: e.clientY - containerRect.top,
      categoryName: hit.categoryName,
      color: hit.color,
      startLabel: formatTime(hit.startTime),
      endLabel: formatTime(hit.endTime),
    });
  };

  const handleMouseLeave = () => setTooltip((t) => ({ ...t, visible: false }));

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
    <div className="flex flex-col items-center gap-4">
      {/* 円形タイムライン */}
      <div ref={containerRef} className="relative w-48 h-48">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
        {!data && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          </div>
        )}

        {/* ツールチップ */}
        {tooltip.visible && (
          <div
            className="absolute z-10 pointer-events-none px-2.5 py-1.5 rounded-lg text-xs shadow-lg bg-white dark:bg-[#1e1e2e] border border-gray-200 dark:border-white/[0.08] whitespace-nowrap"
            style={{ left: tooltip.x + 12, top: tooltip.y - 36 }}
          >
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: tooltip.color }} />
              {tooltip.categoryName}
            </div>
            <div className="text-gray-400 dark:text-white/40 mt-0.5">
              {tooltip.startLabel} 〜 {tooltip.endLabel}
            </div>
          </div>
        )}
      </div>

      {/* 凡例 */}
      {data && (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
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

function timeToAngle(isoStr: string): number {
  const d = new Date(isoStr);
  const hours = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  return (hours / 24) * Math.PI * 2 - Math.PI / 2;
}

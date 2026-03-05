"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCategories } from "@/hooks/useCategories";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";

type Mode = 1 | 2 | 3;

interface RecordFormProps {
  onSaved?: () => void;
}

export function RecordForm({ onSaved }: RecordFormProps) {
  const [mode, setMode] = useState<Mode>(1);
  const [categoryId, setCategoryId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [durationHours, setDurationHours] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [saving, setSaving] = useState(false);

  const { session } = useAuth();
  const { categories } = useCategories();
  const { toast } = useToast();
  const activeCategories = categories.filter((c) => !c.is_archived);

  const computeTimes = (): { start: string; end: string } | null => {
    const dh = parseFloat(durationHours || "0");
    const dm = parseFloat(durationMinutes || "0");
    const durationMs = (dh * 60 + dm) * 60 * 1000;

    if (mode === 1) {
      if (!startTime || durationMs <= 0) return null;
      const start = new Date(startTime);
      const end = new Date(start.getTime() + durationMs);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    if (mode === 2) {
      if (!startTime || !endTime) return null;
      return { start: new Date(startTime).toISOString(), end: new Date(endTime).toISOString() };
    }
    if (mode === 3) {
      if (!endTime || durationMs <= 0) return null;
      const end = new Date(endTime);
      const start = new Date(end.getTime() - durationMs);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) { toast("カテゴリーを選択してください", "error"); return; }
    const times = computeTimes();
    if (!times) { toast("時間を正しく入力してください", "error"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ category_id: categoryId, start_time: times.start, end_time: times.end }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "保存に失敗しました", "error");
      } else {
        toast("記録を保存しました", "success");
        setStartTime(""); setEndTime(""); setDurationHours(""); setDurationMinutes("");
        onSaved?.();

        // 実績チェック
        fetch("/api/achievements/check", {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.access_token}` },
        }).then((r) => r.json()).then((data) => {
          if (data.newlyUnlocked?.length > 0) {
            for (const a of data.newlyUnlocked) {
              toast(`🏆 実績解除: ${a.icon} ${a.name}`, "success");
            }
          }
        }).catch(() => {});
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6">
      <h2 className="text-sm font-medium text-gray-500 dark:text-white/50 uppercase tracking-wider mb-4">
        記録を追加
      </h2>

      {/* Mode tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-white/[0.04] rounded-xl p-1 mb-5">
        {([
          { m: 1, label: "開始+時間" },
          { m: 2, label: "開始+終了" },
          { m: 3, label: "終了+時間" },
        ] as { m: Mode; label: string }[]).map(({ m, label }) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-medium transition",
              mode === m
                ? "bg-white dark:bg-[#1e1e2e] text-gray-900 dark:text-white shadow"
                : "text-gray-500 dark:text-white/50"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category */}
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1.5 block">カテゴリー</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition"
          >
            <option value="">選択してください</option>
            {activeCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Start time */}
        {(mode === 1 || mode === 2) && (
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1.5 block">開始時間</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition"
            />
          </div>
        )}

        {/* End time */}
        {(mode === 2 || mode === 3) && (
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1.5 block">終了時間</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition"
            />
          </div>
        )}

        {/* Duration */}
        {(mode === 1 || mode === 3) && (
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1.5 block">継続時間</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  placeholder="0"
                  className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-white/30">h</span>
              </div>
              <div className="flex-1 relative">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="0"
                  className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-white/30">m</span>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-violet-500 hover:bg-violet-600 text-white font-medium py-2.5 rounded-xl transition disabled:opacity-50"
        >
          {saving ? "保存中..." : "記録を追加"}
        </button>
      </form>
    </div>
  );
}

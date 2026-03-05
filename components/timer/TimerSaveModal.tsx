"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";

interface TimerSaveModalProps {
  elapsed: number;
  startTime: string;
  onSave: (categoryId: string) => void;
  onDiscard: () => void;
  onClose: () => void;
}

export function TimerSaveModal({ elapsed, startTime, onSave, onDiscard, onClose }: TimerSaveModalProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const { categories } = useCategories();

  const activeCategories = categories.filter((c) => !c.is_archived);
  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);

  const handleSave = async () => {
    if (!selectedCategoryId) return;
    setSaving(true);
    await onSave(selectedCategoryId);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#1e1e2e] border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">記録を保存</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-white/30 dark:hover:text-white/60 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-gray-50 dark:bg-white/[0.04] rounded-xl p-4 mb-5 text-center">
          <div className="font-mono text-3xl font-medium">
            {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}
          </div>
          <p className="text-xs text-gray-400 dark:text-white/40 mt-1">
            {new Date(startTime).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} 〜 今
          </p>
        </div>

        <div className="mb-5">
          <label className="text-sm font-medium text-gray-700 dark:text-white/70 mb-2 block">
            カテゴリーを選択
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {activeCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition text-left ${
                  selectedCategoryId === cat.id
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10"
                    : "border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.12]"
                }`}
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-sm">{cat.name}</span>
              </button>
            ))}
            {activeCategories.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-white/40 text-center py-4">
                カテゴリーがありません
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onDiscard}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/[0.06] text-sm text-gray-500 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition"
          >
            破棄
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedCategoryId || saving}
            className="flex-1 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

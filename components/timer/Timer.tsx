"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Square } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { TimerSaveModal } from "./TimerSaveModal";
import { cn } from "@/lib/utils/cn";
import { TimerSession } from "@/types/database";

const MAX_TIMER_MS = 10 * 60 * 60 * 1000; // 10時間

interface TimerProps {
  onSaved?: () => void;
}

export function Timer({ onSaved }: TimerProps) {
  const [session, setSession] = useState<TimerSession | null>(null);
  const [elapsed, setElapsed] = useState(0); // ms
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { session: authSession } = useAuth();
  const { toast } = useToast();
  const hasFetched = useRef(false);

  const token = authSession?.access_token;

  const authHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }), [token]);

  // セッション読み込み（初回のみ）
  useEffect(() => {
    if (!token || hasFetched.current) return;
    hasFetched.current = true;
    fetch("/api/timer", { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        setSession(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  // 経過時間カウント
  useEffect(() => {
    if (!session?.is_active) return;
    const update = () => {
      const diff = Date.now() - new Date(session.start_time).getTime();
      if (diff >= MAX_TIMER_MS) {
        setElapsed(MAX_TIMER_MS);
        setShowModal(true);
      } else {
        setElapsed(diff);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const handleStart = async () => {
    const res = await fetch("/api/timer", { method: "POST", headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      setSession(data);
      setElapsed(0);
    } else {
      toast("タイマーの開始に失敗しました", "error");
    }
  };

  const handleStop = () => {
    setShowModal(true);
  };

  const handleSave = async (categoryId: string) => {
    // 楽観的更新：先にUIをクリア
    const prevSession = session;
    setSession(null);
    setElapsed(0);
    setShowModal(false);

    const res = await fetch("/api/timer", {
      method: "DELETE",
      headers: authHeaders(),
      body: JSON.stringify({ category_id: categoryId }),
    });
    if (res.ok) {
      toast("記録を保存しました", "success");
      onSaved?.();
    } else {
      // 失敗したらロールバック
      setSession(prevSession);
      const err = await res.json().catch(() => ({}));
      toast(err.error ?? "保存に失敗しました", "error");
    }
  };

  const handleDiscard = async () => {
    // 楽観的更新
    setSession(null);
    setElapsed(0);
    setShowModal(false);

    await fetch("/api/timer", {
      method: "DELETE",
      headers: authHeaders(),
      body: JSON.stringify({}),
    }).catch(console.error);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6">
        <div className="h-16 bg-gray-100 dark:bg-white/[0.04] rounded-lg animate-pulse" />
      </div>
    );
  }

  const isActive = session?.is_active;

  return (
    <>
      <div className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6 transition-colors">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-medium text-gray-500 dark:text-white/50 uppercase tracking-wider">
            タイマー
          </h2>
          <span className="text-xs text-gray-400 dark:text-white/30 bg-gray-100 dark:bg-white/[0.04] px-2.5 py-1 rounded-full">
            上限 10時間
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div className="font-mono text-5xl lg:text-6xl font-medium tracking-tight opacity-90">
            {formatTime(isActive ? elapsed : 0)}
          </div>
          {isActive ? (
            <button
              onClick={handleStop}
              disabled={showModal}
              className={cn(
                "w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center hover:bg-red-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed",
                "timer-active"
              )}
            >
              <Square className="w-6 h-6 text-red-500 dark:text-red-400 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="w-14 h-14 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center hover:bg-violet-500/30 transition"
            >
              <Play className="w-6 h-6 text-violet-500 dark:text-violet-400 fill-current ml-0.5" />
            </button>
          )}
        </div>
        {isActive && session && (
          <p className="text-sm text-gray-400 dark:text-white/30 mt-3">
            {new Date(session.start_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} から計測中
          </p>
        )}
        {!isActive && (
          <p className="text-sm text-gray-400 dark:text-white/30 mt-3">タイマーを開始してください</p>
        )}
      </div>

      {showModal && (
        <TimerSaveModal
          elapsed={elapsed}
          startTime={session?.start_time ?? new Date().toISOString()}
          onSave={handleSave}
          onDiscard={handleDiscard}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

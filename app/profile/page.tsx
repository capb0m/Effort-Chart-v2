"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { Header } from "@/components/layout/Header";
import { useTheme } from "next-themes";
import { useToast } from "@/components/ui/Toast";
import { UserProfile } from "@/types/database";
import { Sun, Moon, Monitor, Save, RefreshCw, LogOut } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export default function ProfilePage() {
  const { user, loading, session, signOut } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [username, setUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!session?.access_token) return;
    fetch("/api/profile", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setProfile(data);
          setUsername(data.whatpulse_username ?? "");
          setApiKey(data.whatpulse_api_key ?? "");
        }
      });
  }, [session?.access_token]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ whatpulse_username: username || null, whatpulse_api_key: apiKey || null }),
    });
    setSaving(false);
    if (res.ok) {
      toast("プロフィールを更新しました", "success");
    } else {
      toast("更新に失敗しました", "error");
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    const res = await fetch("/api/whatpulse/sync", {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    setSyncing(false);
    const data = await res.json();
    if (res.ok) {
      toast(`同期完了: ${data.synced}日分のデータを取得しました`, "success");
    } else {
      toast(data.error ?? "同期に失敗しました", "error");
    }
  };

  if (loading || !user) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-hide pb-20 lg:pb-0">
        <Header title="プロフィール" />
        <div className="px-4 lg:px-8 py-6 space-y-6 max-w-2xl">

          {/* User Info */}
          <div className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 text-2xl font-bold">
                {user.email?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div>
                <div className="font-semibold">{user.email}</div>
                <div className="text-sm text-gray-400 dark:text-white/40">Google アカウント</div>
              </div>
            </div>
          </div>

          {/* Theme */}
          <div className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6">
            <h2 className="text-sm font-medium text-gray-500 dark:text-white/50 uppercase tracking-wider mb-4">テーマ</h2>
            <div className="flex gap-3">
              {([
                { value: "light", label: "ライト", icon: Sun },
                { value: "dark", label: "ダーク", icon: Moon },
                { value: "system", label: "システム", icon: Monitor },
              ] as const).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-2 py-3 rounded-xl border transition",
                    theme === value
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400"
                      : "border-gray-200 dark:border-white/[0.06] text-gray-500 dark:text-white/50 hover:border-gray-300"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* WhatPulse */}
          <div className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6">
            <h2 className="text-sm font-medium text-gray-500 dark:text-white/50 uppercase tracking-wider mb-4">
              WhatPulse 連携
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1.5 block">ユーザー名</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="WhatPulse ユーザー名"
                  className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-white/60 mb-1.5 block">API キー</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="WhatPulse API キー"
                  className="w-full bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition"
                />
                <p className="text-xs text-gray-400 dark:text-white/30 mt-1">
                  WhatPulse ダッシュボード → Settings → API Keys から取得
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "保存中..." : "保存"}
                </button>
                {profile?.whatpulse_username && (
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/[0.06] text-sm text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition disabled:opacity-50"
                  >
                    <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
                    同期
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 justify-center py-3 rounded-2xl border border-red-200 dark:border-red-500/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition text-sm"
          >
            <LogOut className="w-4 h-4" />
            ログアウト
          </button>
        </div>
      </main>
      <MobileTabBar />
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  Clock,
  Flag,
  BarChart3,
  Trophy,
  Tag,
  Sun,
  Moon,
  LogOut,
  Zap,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/records", label: "記録", icon: Clock },
  { href: "/goals", label: "目標", icon: Flag },
  { href: "/charts", label: "グラフ", icon: BarChart3 },
  { href: "/achievements", label: "実績", icon: Trophy },
  { href: "/categories", label: "カテゴリー", icon: Tag },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-[#11111b] border-r border-gray-200 dark:border-white/[0.06] p-4 transition-colors">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 py-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-orange-500 flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight">Effort Chart</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                isActive
                  ? "bg-violet-50 dark:bg-white/[0.06] text-violet-700 dark:text-white font-medium"
                  : "text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/[0.03]"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5",
                  isActive ? "text-violet-500 dark:text-violet-400" : ""
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Theme + User */}
      <div className="space-y-2 border-t border-gray-200 dark:border-white/[0.06] pt-3 mt-2">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.03] transition w-full text-sm text-gray-500 dark:text-white/50"
        >
          {theme === "dark" ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
          テーマ切替
        </button>
        <div className="flex items-center justify-between px-3 py-2.5">
          <Link href="/profile" className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 text-sm font-bold flex-shrink-0">
              {user?.email?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.email ?? "ユーザー"}</div>
              <div className="text-xs text-gray-400 dark:text-white/30">プロフィール</div>
            </div>
          </Link>
          <button
            onClick={signOut}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-400 dark:text-white/30 transition"
            title="ログアウト"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

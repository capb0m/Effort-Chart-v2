"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { LayoutDashboard, Clock, Flag, BarChart3, Trophy } from "lucide-react";

const TAB_ITEMS = [
  { href: "/dashboard", label: "ホーム", icon: LayoutDashboard },
  { href: "/records", label: "記録", icon: Clock },
  { href: "/goals", label: "目標", icon: Flag },
  { href: "/charts", label: "グラフ", icon: BarChart3 },
  { href: "/achievements", label: "実績", icon: Trophy },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-[#11111b]/95 backdrop-blur-xl border-t border-gray-200 dark:border-white/[0.06] z-40 transition-colors">
      <div className="flex items-center justify-around py-2 px-2">
        {TAB_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors",
                isActive
                  ? "text-violet-600 dark:text-violet-400"
                  : "text-gray-400 dark:text-white/40"
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
              <span className={cn("text-[10px]", isActive && "font-medium")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

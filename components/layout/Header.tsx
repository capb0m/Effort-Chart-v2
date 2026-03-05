"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
}

export function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-gray-50/80 dark:bg-[#0a0a14]/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/[0.06] px-4 lg:px-8 py-4 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-white/40 mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && (
          <Link
            href={action.href}
            className="flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            {action.label}
          </Link>
        )}
      </div>
    </header>
  );
}

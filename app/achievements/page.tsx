"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { Header } from "@/components/layout/Header";
import { useAchievements } from "@/hooks/useAchievements";
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  ACHIEVEMENT_TIER_COLORS,
  AchievementCategory,
} from "@/lib/achievements/registry";
import { cn } from "@/lib/utils/cn";
import { Lock } from "lucide-react";

const TIER_ORDER = ["platinum", "gold", "silver", "bronze"] as const;

export default function AchievementsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { achievements, loading: achLoading } = useAchievements();

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  if (loading || !user) return null;

  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;
  const totalCount = achievements.length;

  const categories = Object.keys(ACHIEVEMENT_CATEGORY_LABELS) as AchievementCategory[];

  // ティア別集計
  const tierCounts = TIER_ORDER.reduce((acc, tier) => {
    acc[tier] = {
      total: achievements.filter((a) => a.tier === tier).length,
      unlocked: achievements.filter((a) => a.tier === tier && a.unlockedAt).length,
    };
    return acc;
  }, {} as Record<string, { total: number; unlocked: number }>);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-hide pb-20 lg:pb-0">
        <Header title="実績" />
        <div className="px-4 lg:px-8 py-6 space-y-6 max-w-4xl">

          {/* Summary */}
          <div className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-3xl font-bold">{unlockedCount}<span className="text-lg font-normal text-gray-400 dark:text-white/40">/{totalCount}</span></div>
                <div className="text-sm text-gray-500 dark:text-white/40">解除済み</div>
              </div>
              <div className="flex gap-3">
                {TIER_ORDER.map((tier) => (
                  <div key={tier} className="text-center">
                    <div className="text-lg font-bold" style={{ color: ACHIEVEMENT_TIER_COLORS[tier] }}>
                      {tierCounts[tier]?.unlocked ?? 0}
                    </div>
                    <div className="text-[10px] text-gray-400 dark:text-white/30 capitalize">{tier}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-orange-500 rounded-full transition-all"
                style={{ width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Category Groups */}
          {achLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 bg-gray-100 dark:bg-white/[0.04] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            categories.map((cat) => {
              const catAchievements = achievements.filter((a) => a.category === cat);
              if (catAchievements.length === 0) return null;
              const catUnlocked = catAchievements.filter((a) => a.unlockedAt).length;

              return (
                <div key={cat} className="bg-white dark:bg-[#1e1e2e]/50 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
                    <h2 className="text-sm font-medium text-gray-500 dark:text-white/50 uppercase tracking-wider">
                      {ACHIEVEMENT_CATEGORY_LABELS[cat]}
                    </h2>
                    <span className="text-xs text-gray-400 dark:text-white/30">{catUnlocked}/{catAchievements.length}</span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {catAchievements.map((achievement) => {
                      const isUnlocked = !!achievement.unlockedAt;
                      const tierColor = ACHIEVEMENT_TIER_COLORS[achievement.tier];

                      return (
                        <div
                          key={achievement.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border transition",
                            isUnlocked
                              ? "border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03]"
                              : "border-gray-100 dark:border-white/[0.04] opacity-50"
                          )}
                        >
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0", !isUnlocked && "grayscale")}
                            style={{ backgroundColor: isUnlocked ? tierColor + "33" : undefined }}>
                            {isUnlocked ? achievement.icon : <Lock className="w-4 h-4 text-gray-400 dark:text-white/30" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium truncate">{achievement.name}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium capitalize flex-shrink-0"
                                style={{ backgroundColor: tierColor + "33", color: tierColor }}>
                                {achievement.tier}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 dark:text-white/40 truncate">{achievement.description}</div>
                            {isUnlocked && achievement.unlockedAt && (
                              <div className="text-[10px] text-gray-300 dark:text-white/20 mt-0.5">
                                {new Date(achievement.unlockedAt).toLocaleDateString("ja-JP")}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
      <MobileTabBar />
    </div>
  );
}

"use client";

import useSWR from "swr";
import { useAuth } from "@/contexts/AuthContext";
import { AchievementDefinition } from "@/lib/achievements/registry";
import { UserAchievement } from "@/types/database";

async function fetcher([url, token]: [string, string]) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Fetch error");
  return res.json();
}

export interface AchievementWithStatus extends AchievementDefinition {
  unlockedAt: string | null;
}

export function useAchievements() {
  const { session } = useAuth();
  const token = session?.access_token;

  const { data, error, mutate } = useSWR<{
    achievements: AchievementWithStatus[];
    unlocked: UserAchievement[];
  }>(
    token ? ["/api/achievements", token] : null,
    fetcher,
    { dedupingInterval: 60000 }
  );

  return {
    achievements: data?.achievements ?? [],
    unlocked: data?.unlocked ?? [],
    loading: !data && !error,
    error,
    mutate,
  };
}

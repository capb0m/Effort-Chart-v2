"use client";

import useSWR from "swr";
import { useAuth } from "@/contexts/AuthContext";
import { Goal, StreakData, GoalHistory } from "@/types/database";

async function fetcher([url, token]: [string, string]) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Fetch error");
  return res.json();
}

export function useGoals() {
  const { session } = useAuth();
  const token = session?.access_token;

  const { data, error, mutate } = useSWR<Goal[]>(
    token ? ["/api/goals", token] : null,
    fetcher,
    { dedupingInterval: 300000 }
  );

  return { goals: data ?? [], loading: !data && !error, error, mutate };
}

export function useStreak() {
  const { session } = useAuth();
  const token = session?.access_token;

  const { data, error, mutate } = useSWR<StreakData>(
    token ? ["/api/goals/streak", token] : null,
    fetcher,
    { dedupingInterval: 300000 }
  );

  return { streak: data, loading: !data && !error, error, mutate };
}

export function useGoalHistory(view: "daily" | "weekly" | "monthly" = "daily") {
  const { session } = useAuth();
  const token = session?.access_token;

  const { data, error, mutate } = useSWR<GoalHistory>(
    token ? [`/api/goals/history?view=${view}`, token] : null,
    fetcher,
    { dedupingInterval: 300000 }
  );

  return { history: data, loading: !data && !error, error, mutate };
}

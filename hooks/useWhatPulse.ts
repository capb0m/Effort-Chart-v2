"use client";

import useSWR from "swr";
import { useAuth } from "@/contexts/AuthContext";

async function fetcher([url, token]: [string, string]) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Fetch error");
  return res.json();
}

export interface WhatPulseData {
  today: number;
  yesterday: number;
  hasConfig: boolean;
}

export function useWhatPulse() {
  const { session } = useAuth();
  const token = session?.access_token;

  const { data, error, mutate } = useSWR<WhatPulseData>(
    token ? ["/api/whatpulse/daily", token] : null,
    fetcher,
    { dedupingInterval: 3600000 }
  );

  return {
    whatpulse: data,
    loading: !data && !error,
    error,
    mutate,
  };
}

"use client";

import { useEffect } from "react";
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
  needsSync?: boolean;
}

export function useWhatPulse() {
  const { session } = useAuth();
  const token = session?.access_token;

  const { data, error, mutate } = useSWR<WhatPulseData>(
    token ? ["/api/whatpulse/daily", token] : null,
    fetcher,
    { dedupingInterval: 60000 }
  );

  // needsSync=true のとき自動的に同期してデータを再取得する
  useEffect(() => {
    if (!token || !data?.needsSync) return;

    fetch("/api/whatpulse/sync", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? mutate() : null)
      .catch(() => null);
  }, [token, data?.needsSync, mutate]);

  return {
    whatpulse: data,
    loading: !data && !error,
    error,
    mutate,
  };
}

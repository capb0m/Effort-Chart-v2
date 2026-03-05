"use client";

import { useEffect, useState } from "react";
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
  const [syncError, setSyncError] = useState<string | null>(null);

  const { data, error, mutate } = useSWR<WhatPulseData>(
    token ? ["/api/whatpulse/daily", token] : null,
    fetcher,
    { dedupingInterval: 60000 }
  );

  // needsSync=true のとき自動的に同期してデータを再取得する
  useEffect(() => {
    if (!token || !data?.needsSync) return;
    setSyncError(null);

    fetch("/api/whatpulse/sync", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (r.ok) {
          mutate();
        } else {
          const body = await r.json().catch(() => ({}));
          setSyncError(body.error ?? "WhatPulse同期に失敗しました");
        }
      })
      .catch((e) => setSyncError(String(e)));
  }, [token, data?.needsSync, mutate]);

  return {
    whatpulse: data,
    loading: !data && !error,
    error,
    syncError,
    mutate,
  };
}

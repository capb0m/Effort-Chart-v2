"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  const { data, error, mutate } = useSWR<WhatPulseData>(
    token ? ["/api/whatpulse/daily", token] : null,
    fetcher,
    { dedupingInterval: 60000 }
  );

  const sync = useCallback(async () => {
    if (!token || isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const r = await fetch("/api/whatpulse/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        await mutate();
      } else {
        const body = await r.json().catch(() => ({}));
        setSyncError(body.error ?? "WhatPulse同期に失敗しました");
      }
    } catch (e) {
      setSyncError(String(e));
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [token, mutate]);

  // needsSync=true のとき自動的に同期してデータを再取得する
  useEffect(() => {
    if (!token || !data?.needsSync) return;
    sync();
  }, [token, data?.needsSync, sync]);

  // 1時間ごとに自動同期
  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      sync();
    }, 3600000);
    return () => clearInterval(id);
  }, [token, sync]);

  return {
    whatpulse: data,
    loading: !data && !error,
    error,
    syncError,
    isSyncing,
    sync,
    mutate,
  };
}

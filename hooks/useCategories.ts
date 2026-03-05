"use client";

import useSWR from "swr";
import { useAuth } from "@/contexts/AuthContext";
import { Category } from "@/types/database";

async function fetcher([url, token]: [string, string]) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Fetch error");
  return res.json();
}

export function useCategories() {
  const { session } = useAuth();
  const token = session?.access_token;

  const { data, error, mutate } = useSWR<Category[]>(
    token ? ["/api/categories", token] : null,
    fetcher,
    { dedupingInterval: 60000 }
  );

  return {
    categories: data ?? [],
    loading: !data && !error,
    error,
    mutate,
  };
}

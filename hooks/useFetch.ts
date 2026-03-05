"use client";

import { useAuth } from "@/contexts/AuthContext";

export function useFetch() {
  const { getToken } = useAuth();

  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = await getToken();
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  };

  return { authFetch };
}

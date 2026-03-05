const WHATPULSE_NEW_API = "https://whatpulse.org/api/v1";
const WHATPULSE_OLD_API = "https://api.whatpulse.org";

interface WhatPulseNewPulse {
  timeDate: string;
  keys: number;
  clicks: number;
}

interface WhatPulseOldPulse {
  Date: string;
  Keys: string;
  Clicks: string;
}

export interface DailyKeyStats {
  date: string;
  total_keys: number;
  total_clicks: number;
}

export async function fetchWhatPulseDaily(
  username: string,
  apiKey: string,
  startDate: string,
  endDate: string
): Promise<DailyKeyStats[]> {
  // 新APIを試みる
  try {
    const url = `${WHATPULSE_NEW_API}/users/${username}/timeseries?start=${startDate}&end=${endDate}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 0 },
    });

    if (res.ok) {
      const data: WhatPulseNewPulse[] = await res.json();
      const dailyMap = new Map<string, { keys: number; clicks: number }>();

      for (const pulse of data) {
        const date = pulse.timeDate.split("T")[0];
        const existing = dailyMap.get(date) ?? { keys: 0, clicks: 0 };
        dailyMap.set(date, {
          keys: existing.keys + (pulse.keys ?? 0),
          clicks: existing.clicks + (pulse.clicks ?? 0),
        });
      }

      return Array.from(dailyMap.entries()).map(([date, stats]) => ({
        date,
        total_keys: stats.keys,
        total_clicks: stats.clicks,
      }));
    }
  } catch {
    // フォールバックへ
  }

  // 旧APIフォールバック
  const startTs = Math.floor(new Date(startDate).getTime() / 1000);
  const endTs = Math.floor(new Date(endDate + "T23:59:59Z").getTime() / 1000);
  const url = `${WHATPULSE_OLD_API}/pulses.php?user=${username}&format=json&start=${startTs}&end=${endTs}`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error("WhatPulse API error");

  const data: WhatPulseOldPulse[] = await res.json();
  const dailyMap = new Map<string, { keys: number; clicks: number }>();

  for (const pulse of data) {
    const date = pulse.Date.split(" ")[0];
    const existing = dailyMap.get(date) ?? { keys: 0, clicks: 0 };
    dailyMap.set(date, {
      keys: existing.keys + parseInt(pulse.Keys ?? "0", 10),
      clicks: existing.clicks + parseInt(pulse.Clicks ?? "0", 10),
    });
  }

  return Array.from(dailyMap.entries()).map(([date, stats]) => ({
    date,
    total_keys: stats.keys,
    total_clicks: stats.clicks,
  }));
}

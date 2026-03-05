const WHATPULSE_API = "https://api.whatpulse.org";

interface WhatPulsePulse {
  Date?: string;
  Keys?: string;
  KeyStrokes?: string;
  Clicks?: string;
  MouseClicks?: string;
}

export interface DailyKeyStats {
  date: string;
  total_keys: number;
  total_clicks: number;
}

export async function fetchWhatPulseDaily(
  username: string,
  _apiKey: string,
  startDate: string,
  endDate: string
): Promise<DailyKeyStats[]> {
  const startTs = Math.floor(new Date(startDate).getTime() / 1000);
  const endTs = Math.floor(new Date(endDate + "T23:59:59Z").getTime() / 1000);
  const url = `${WHATPULSE_API}/pulses.php?user=${encodeURIComponent(username)}&format=json&start=${startTs}&end=${endTs}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`WhatPulse API error: HTTP ${res.status}`);

  const raw = await res.text();
  let pulses: WhatPulsePulse[];
  try {
    const parsed = JSON.parse(raw);
    // APIがオブジェクトを返す場合（配列でない）
    pulses = Array.isArray(parsed) ? parsed : Object.values(parsed);
  } catch {
    throw new Error(`WhatPulse parse error: ${raw.slice(0, 200)}`);
  }

  if (!Array.isArray(pulses)) {
    throw new Error(`WhatPulse unexpected format: ${raw.slice(0, 200)}`);
  }

  const dailyMap = new Map<string, { keys: number; clicks: number }>();

  for (const pulse of pulses) {
    const rawDate = pulse.Date ?? "";
    const date = rawDate.includes("T") ? rawDate.split("T")[0] : rawDate.split(" ")[0];
    if (!date) continue;

    // Date が startDate〜endDate の範囲外ならスキップ
    if (date < startDate || date > endDate) continue;

    const existing = dailyMap.get(date) ?? { keys: 0, clicks: 0 };
    const keys = parseInt(pulse.Keys ?? pulse.KeyStrokes ?? "0", 10);
    const clicks = parseInt(pulse.Clicks ?? pulse.MouseClicks ?? "0", 10);
    dailyMap.set(date, { keys: existing.keys + keys, clicks: existing.clicks + clicks });
  }

  return Array.from(dailyMap.entries()).map(([date, stats]) => ({
    date,
    total_keys: stats.keys,
    total_clicks: stats.clicks,
  }));
}

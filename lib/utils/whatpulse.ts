const WHATPULSE_API = "https://api.whatpulse.org";

interface WhatPulsePulse {
  Date?: string;
  Keys?: string | number;
  KeyStrokes?: string | number;
  Clicks?: string | number;
  MouseClicks?: string | number;
  [key: string]: unknown;
}

export interface DailyKeyStats {
  date: string;
  total_keys: number;
  total_clicks: number;
}

export interface FetchResult {
  stats: DailyKeyStats[];
  rawCount: number; // デバッグ用：APIが返したパルス総数
}

export async function fetchWhatPulseDaily(
  username: string,
  _apiKey: string,
  startDate: string,
  endDate: string
): Promise<FetchResult> {
  // start/end パラメータは無視される場合があるため使用しない
  const url = `${WHATPULSE_API}/pulses.php?user=${encodeURIComponent(username)}&format=json`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`WhatPulse API error: HTTP ${res.status}`);

  const raw = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`WhatPulse parse error: ${raw.slice(0, 300)}`);
  }

  // 配列 or オブジェクト（キー付き）に対応
  let pulses: WhatPulsePulse[];
  if (Array.isArray(parsed)) {
    pulses = parsed;
  } else if (parsed && typeof parsed === "object") {
    // { "1": {...}, "2": {...} } 形式
    pulses = Object.values(parsed as Record<string, WhatPulsePulse>);
  } else {
    throw new Error(`WhatPulse unexpected format: ${raw.slice(0, 200)}`);
  }

  const dailyMap = new Map<string, { keys: number; clicks: number }>();

  for (const pulse of pulses) {
    const rawDate = String(pulse.Date ?? "");
    // "2026-03-05 20:15:32" or "2026-03-05T20:15:32Z" → "2026-03-05"
    const date = rawDate.split(/[T ]/)[0];
    if (!date || date.length < 10) continue;

    // 日付範囲フィルタ
    if (date < startDate || date > endDate) continue;

    const existing = dailyMap.get(date) ?? { keys: 0, clicks: 0 };
    const keys = parseInt(String(pulse.Keys ?? pulse.KeyStrokes ?? "0"), 10);
    const clicks = parseInt(String(pulse.Clicks ?? pulse.MouseClicks ?? "0"), 10);
    dailyMap.set(date, { keys: existing.keys + (isNaN(keys) ? 0 : keys), clicks: existing.clicks + (isNaN(clicks) ? 0 : clicks) });
  }

  return {
    stats: Array.from(dailyMap.entries()).map(([date, s]) => ({
      date,
      total_keys: s.keys,
      total_clicks: s.clicks,
    })),
    rawCount: pulses.length,
  };
}

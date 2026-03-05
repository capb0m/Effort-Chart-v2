const WHATPULSE_API = "https://api.whatpulse.org";

interface WhatPulsePulse {
  Date?: string | number;
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
  rawCount: number;
  sampleDates: string[]; // デバッグ用：最初の数件の生Date値
}

/** WhatPulse の Date フィールドを YYYY-MM-DD (UTC) に変換する */
function parsePulseDate(raw: string | number | undefined): string | null {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();

  // Unixタイムスタンプ（9〜11桁の数字）
  if (/^\d{9,11}$/.test(s)) {
    const d = new Date(parseInt(s, 10) * 1000);
    return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
  }

  // "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM:SSZ"
  const dateStr = s.replace(" ", "T");
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];

  // "YYYY-MM-DD" そのままの場合
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  return null;
}

export async function fetchWhatPulseDaily(
  username: string,
  _apiKey: string,
  startDate: string,
  endDate: string
): Promise<FetchResult> {
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

  // 配列 or { "1": {...}, "2": {...} } 形式に対応
  let pulses: WhatPulsePulse[];
  if (Array.isArray(parsed)) {
    pulses = parsed;
  } else if (parsed && typeof parsed === "object") {
    pulses = Object.values(parsed as Record<string, WhatPulsePulse>);
  } else {
    throw new Error(`WhatPulse unexpected format: ${raw.slice(0, 200)}`);
  }

  // デバッグ用：最初の3件の生Date値
  const sampleDates = pulses.slice(0, 3).map((p) => String(p.Date ?? "(none)"));

  const dailyMap = new Map<string, { keys: number; clicks: number }>();

  for (const pulse of pulses) {
    const date = parsePulseDate(pulse.Date);
    if (!date) continue;

    // 日付範囲フィルタ
    if (date < startDate || date > endDate) continue;

    const existing = dailyMap.get(date) ?? { keys: 0, clicks: 0 };
    const keys = parseInt(String(pulse.Keys ?? pulse.KeyStrokes ?? "0"), 10);
    const clicks = parseInt(String(pulse.Clicks ?? pulse.MouseClicks ?? "0"), 10);
    dailyMap.set(date, {
      keys: existing.keys + (isNaN(keys) ? 0 : keys),
      clicks: existing.clicks + (isNaN(clicks) ? 0 : clicks),
    });
  }

  return {
    stats: Array.from(dailyMap.entries()).map(([date, s]) => ({
      date,
      total_keys: s.keys,
      total_clicks: s.clicks,
    })),
    rawCount: pulses.length,
    sampleDates,
  };
}

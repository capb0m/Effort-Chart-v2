import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { fetchWhatPulseDaily } from "@/lib/utils/whatpulse";
import { format, subDays } from "date-fns";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("whatpulse_username, whatpulse_api_key")
    .eq("user_id", user.id)
    .single();

  if (!profile?.whatpulse_username || !profile?.whatpulse_api_key) {
    return NextResponse.json({ error: "WhatPulse設定がありません" }, { status: 400 });
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");

  try {
    const { stats: dailyStats, rawCount, sampleDates } = await fetchWhatPulseDaily(
      profile.whatpulse_username,
      profile.whatpulse_api_key,
      thirtyDaysAgo,
      today
    );

    if (dailyStats.length > 0) {
      const upsertData = dailyStats.map((stat) => ({
        user_id: user.id,
        date: stat.date,
        total_keys: stat.total_keys,
        total_clicks: stat.total_clicks,
        fetched_at: new Date().toISOString(),
      }));

      const { error: upsertError } = await supabase
        .from("whatpulse_daily_stats")
        .upsert(upsertData, { onConflict: "user_id,date" });

      if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    // rawCount: APIから取得したパルス総数（0なら username が間違っている可能性）
    return NextResponse.json({ success: true, synced: dailyStats.length, rawCount, sampleDates, range: { from: thirtyDaysAgo, to: today } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "WhatPulse API エラー" }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { format, subDays } from "date-fns";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("whatpulse_username, whatpulse_api_key")
    .eq("user_id", user.id)
    .single();

  if (!profile?.whatpulse_username || !profile?.whatpulse_api_key) {
    return NextResponse.json({ hasConfig: false, today: 0, yesterday: 0 });
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

  // キャッシュから取得
  const { data: cachedStats } = await supabase
    .from("whatpulse_daily_stats")
    .select("*")
    .eq("user_id", user.id)
    .in("date", [today, yesterday]);

  const todayCache = cachedStats?.find((s) => s.date === today);
  const yesterdayCache = cachedStats?.find((s) => s.date === yesterday);

  // 今日のキャッシュが1時間以内なら返す
  const cacheAge = todayCache
    ? (Date.now() - new Date(todayCache.fetched_at).getTime()) / 1000 / 60
    : Infinity;

  if (cacheAge < 60 && todayCache) {
    return NextResponse.json({
      hasConfig: true,
      today: todayCache.total_keys,
      yesterday: yesterdayCache?.total_keys ?? 0,
    });
  }

  return NextResponse.json({
    hasConfig: true,
    today: todayCache?.total_keys ?? 0,
    yesterday: yesterdayCache?.total_keys ?? 0,
    needsSync: true,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { format, subDays, parseISO } from "date-fns";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  const [recordsRes, categoriesRes, whatpulseRes, goalsRes] = await Promise.all([
    supabase.from("records").select("start_time, end_time").eq("user_id", user.id),
    supabase.from("categories").select("id").eq("user_id", user.id).eq("is_archived", false),
    supabase.from("whatpulse_daily_stats").select("total_keys, date").eq("user_id", user.id),
    supabase.from("goals").select("target_hours").eq("user_id", user.id).eq("type", "daily"),
  ]);

  const records = (recordsRes.data ?? []) as { start_time: string; end_time: string }[];
  const categoryCount = categoriesRes.data?.length ?? 0;
  const whatpulseStats = (whatpulseRes.data ?? []) as { total_keys: number }[];
  const goals = (goalsRes.data ?? []) as { target_hours: number }[];

  const dailyHoursMap = new Map<string, number>();
  let totalHours = 0;
  let longestSingleSession = 0;
  let hasEarlyMorningRecord = false;
  let hasLateNightRecord = false;
  let hasShortSession = false;

  for (const r of records) {
    const h = (new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) / (1000 * 60 * 60);
    const dateStr = format(parseISO(r.start_time), "yyyy-MM-dd");
    totalHours += h;
    if (h > longestSingleSession) longestSingleSession = h;
    if (h > 0 && h < 5 / 60) hasShortSession = true;
    dailyHoursMap.set(dateStr, (dailyHoursMap.get(dateStr) ?? 0) + h);
    const startHour = new Date(r.start_time).getHours();
    const endHour = new Date(r.end_time).getHours();
    if (startHour >= 4 && startHour < 6) hasEarlyMorningRecord = true;
    if (endHour >= 2 && endHour < 6) hasLateNightRecord = true;
  }

  const maxDailyHours = dailyHoursMap.size > 0 ? Math.max(...Array.from(dailyHoursMap.values())) : 0;

  const totalKeys = whatpulseStats.reduce((sum, s) => sum + (s.total_keys ?? 0), 0);
  const maxDailyKeys = (whatpulseRes.data ?? []).reduce((max: number, s: any) => Math.max(max, s.total_keys ?? 0), 0);

  const recordDates = new Set(records.map((r) => format(parseISO(r.start_time), "yyyy-MM-dd")));
  let consecutiveDaysRecorded = 0;
  for (let i = 0; i < 365; i++) {
    if (recordDates.has(format(subDays(new Date(), i), "yyyy-MM-dd"))) consecutiveDaysRecorded++;
    else break;
  }

  let currentStreak = 0, longestStreak = 0, dailyGoalsAchievedDays = 0;
  if (goals.length > 0) {
    const totalTarget = goals.reduce((s, g) => s + g.target_hours, 0);
    const achievedDates = new Set<string>();
    for (const [date, h] of dailyHoursMap.entries()) {
      if (h >= totalTarget) achievedDates.add(date);
    }
    dailyGoalsAchievedDays = achievedDates.size;
    const sorted = Array.from(achievedDates).sort();
    let temp = 0;
    for (let i = 0; i < sorted.length; i++) {
      temp = i === 0 ? 1 : (Math.round((new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86400000) === 1 ? temp + 1 : 1);
      longestStreak = Math.max(longestStreak, temp);
    }
    for (let i = 0; i < 365; i++) {
      if (achievedDates.has(format(subDays(new Date(), i), "yyyy-MM-dd"))) currentStreak++;
      else break;
    }
  }

  return NextResponse.json({
    totalHours,
    totalKeys,
    maxDailyKeys,
    totalRecords: records.length,
    currentStreak,
    longestStreak,
    dailyGoalsAchievedDays,
    categories: categoryCount,
    consecutiveDaysRecorded,
    longestSingleSession,
    maxDailyHours,
    hasEarlyMorningRecord,
    hasLateNightRecord,
    hasShortSession,
  });
}

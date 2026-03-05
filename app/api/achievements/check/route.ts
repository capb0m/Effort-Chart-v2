import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { checkAchievements } from "@/lib/achievements/checker";
import { AchievementContext } from "@/lib/achievements/registry";
import { ACHIEVEMENT_DEFINITIONS } from "@/lib/achievements/definitions";
import { format, subDays, parseISO } from "date-fns";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  // 既解除実績
  const { data: unlockedRaw } = await supabase
    .from("user_achievements")
    .select("*")
    .eq("user_id", user.id);
  const unlocked = unlockedRaw as { achievement_id: string }[] | null;
  const alreadyUnlocked = (unlocked ?? []).map((u) => u.achievement_id);

  // コンテキスト構築
  const [recordsRes, categoriesRes, whatpulseRes] = await Promise.all([
    supabase.from("records").select("*").eq("user_id", user.id),
    supabase.from("categories").select("id").eq("user_id", user.id).eq("is_archived", false),
    supabase.from("whatpulse_daily_stats").select("total_keys, date").eq("user_id", user.id),
  ]);

  const records = (recordsRes.data ?? []) as { start_time: string; end_time: string; category_id: string }[];
  const categoryCount = categoriesRes.data?.length ?? 0;
  const whatpulseStats = (whatpulseRes.data ?? []) as { total_keys: number; date: string }[];

  // 累計時間
  let totalHours = 0;
  let longestSingleSession = 0;
  for (const r of records) {
    const h = (new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) / (1000 * 60 * 60);
    totalHours += h;
    if (h > longestSingleSession) longestSingleSession = h;
  }

  // キーストローク（最大値を取得）
  const totalKeystrokes = whatpulseStats.reduce((sum, s) => sum + (s.total_keys ?? 0), 0);
  const maxDailyKeys = whatpulseStats.reduce((max, s) => Math.max(max, s.total_keys ?? 0), 0);

  // 連続記録日数
  const recordDates = new Set(records.map((r) => format(parseISO(r.start_time), "yyyy-MM-dd")));
  let consecutiveDaysRecorded = 0;
  for (let i = 0; i < 365; i++) {
    const date = format(subDays(new Date(), i), "yyyy-MM-dd");
    if (recordDates.has(date)) {
      consecutiveDaysRecorded++;
    } else break;
  }

  // ストリーク（/api/goals/streakを再利用する代わりに簡略計算）
  const { data: goalsRaw } = await supabase.from("goals").select("*").eq("user_id", user.id).eq("type", "daily");
  const goals = goalsRaw as { target_hours: number; category_id: string | null }[] | null;
  let currentStreak = 0, longestStreak = 0;

  if (goals && goals.length > 0) {
    const dailyMap = new Map<string, number>();
    for (const r of records) {
      const date = format(parseISO(r.start_time), "yyyy-MM-dd");
      const h = (new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) / (1000 * 60 * 60);
      dailyMap.set(date, (dailyMap.get(date) ?? 0) + h);
    }
    const totalTarget = goals.reduce((s, g) => s + g.target_hours, 0);
    const achievedDates = new Set<string>();
    for (const [date, h] of dailyMap.entries()) {
      if (h >= totalTarget) achievedDates.add(date);
    }
    const sorted = Array.from(achievedDates).sort();
    let temp = 0;
    for (let i = 0; i < sorted.length; i++) {
      temp = i === 0 ? 1 : (Math.round((new Date(sorted[i]).getTime() - new Date(sorted[i-1]).getTime()) / 86400000) === 1 ? temp + 1 : 1);
      longestStreak = Math.max(longestStreak, temp);
    }
    for (let i = 0; i < 365; i++) {
      if (achievedDates.has(format(subDays(new Date(), i), "yyyy-MM-dd"))) currentStreak++;
      else break;
    }
  }

  const ctx: AchievementContext = {
    userId: user.id,
    currentStreak,
    longestStreak,
    totalRecords: records.length,
    totalHours,
    totalKeystrokes: maxDailyKeys, // 日次最大値で評価
    periodGoalsCompleted: 0,
    dailyGoalsAchievedDays: 0,
    categories: categoryCount,
    consecutiveDaysRecorded,
    longestSingleSession,
  };

  const { newlyUnlocked } = await checkAchievements(ctx, alreadyUnlocked);

  if (newlyUnlocked.length > 0) {
    await supabase.from("user_achievements").insert(
      newlyUnlocked.map((id) => ({
        user_id: user.id,
        achievement_id: id,
        unlocked_at: new Date().toISOString(),
      }))
    );
  }

  const newDefs = ACHIEVEMENT_DEFINITIONS
    .filter((d) => newlyUnlocked.includes(d.id))
    .map((d) => ({ id: d.id, name: d.name, icon: d.icon, tier: d.tier }));

  return NextResponse.json({ newlyUnlocked: newDefs });
}

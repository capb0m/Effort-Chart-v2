import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  // デイリー目標を取得
  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .eq("type", "daily");

  if (!goals || goals.length === 0) {
    return NextResponse.json({ currentStreak: 0, longestStreak: 0, lastAchievedDate: null });
  }

  // 過去365日分の記録を取得
  const since = subDays(new Date(), 365).toISOString();
  const { data: records } = await supabase
    .from("records")
    .select("*")
    .eq("user_id", user.id)
    .gte("start_time", since)
    .order("start_time", { ascending: true });

  if (!records) {
    return NextResponse.json({ currentStreak: 0, longestStreak: 0, lastAchievedDate: null });
  }

  // 各日の合計時間をカテゴリー別に集計
  const dailyHours = new Map<string, Map<string | null, number>>();

  for (const record of records) {
    const date = format(parseISO(record.start_time), "yyyy-MM-dd");
    if (!dailyHours.has(date)) dailyHours.set(date, new Map());
    const catMap = dailyHours.get(date)!;
    const start = parseISO(record.start_time);
    const end = parseISO(record.end_time);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    catMap.set(record.category_id, (catMap.get(record.category_id) ?? 0) + hours);
    catMap.set(null, (catMap.get(null) ?? 0) + hours); // 全体合計
  }

  // 各日が全デイリー目標を達成したか判定
  const achievedDates = new Set<string>();
  for (const [date, catMap] of dailyHours.entries()) {
    const allAchieved = goals.every((goal) => {
      const targetKey = goal.category_id ?? null;
      const actual = catMap.get(targetKey) ?? 0;
      return actual >= goal.target_hours;
    });
    if (allAchieved) achievedDates.add(date);
  }

  // ストリーク計算
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let lastAchievedDate: string | null = null;

  const today = format(new Date(), "yyyy-MM-dd");
  let checkDate = new Date();

  // 今日から遡ってストリークを計算
  for (let i = 0; i < 365; i++) {
    const dateStr = format(checkDate, "yyyy-MM-dd");
    if (achievedDates.has(dateStr)) {
      if (i === 0 || currentStreak > 0) currentStreak++;
      if (!lastAchievedDate) lastAchievedDate = dateStr;
    } else if (i === 0) {
      // 今日未達成でも昨日から計算
    } else {
      break;
    }
    checkDate = subDays(checkDate, 1);
  }

  // 最長ストリーク計算
  const sortedDates = Array.from(achievedDates).sort();
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  return NextResponse.json({ currentStreak, longestStreak, lastAchievedDate });
}

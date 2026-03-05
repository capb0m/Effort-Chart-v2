import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .eq("type", "daily");

  if (!goals || goals.length === 0) {
    return NextResponse.json({ daily: [], weekly: [], monthly: [] });
  }

  const since = subDays(new Date(), 90).toISOString();
  const { data: records } = await supabase
    .from("records")
    .select("*")
    .eq("user_id", user.id)
    .gte("start_time", since)
    .order("start_time", { ascending: true });

  // 日別集計
  const dailyHours = new Map<string, Map<string | null, number>>();
  for (const record of records ?? []) {
    const date = format(parseISO(record.start_time), "yyyy-MM-dd");
    if (!dailyHours.has(date)) dailyHours.set(date, new Map());
    const catMap = dailyHours.get(date)!;
    const hours = (new Date(record.end_time).getTime() - new Date(record.start_time).getTime()) / (1000 * 60 * 60);
    catMap.set(record.category_id, (catMap.get(record.category_id) ?? 0) + hours);
    catMap.set(null, (catMap.get(null) ?? 0) + hours);
  }

  // デイリー達成率（過去30日）
  const daily: { date: string; rate: number; achieved: boolean; actualHours: number; targetHours: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = format(subDays(new Date(), i), "yyyy-MM-dd");
    const catMap = dailyHours.get(date) ?? new Map();
    const totalTarget = goals.reduce((sum, g) => sum + g.target_hours, 0);
    const totalActual = goals.reduce((sum, g) => {
      return sum + (catMap.get(g.category_id ?? null) ?? 0);
    }, 0);
    const rate = totalTarget > 0 ? Math.min(totalActual / totalTarget, 1.0) : 0;
    daily.push({ date, rate, achieved: rate >= 1.0, actualHours: totalActual, targetHours: totalTarget });
  }

  // 週別達成率（過去8週）
  const weekly: { week: string; rate: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = startOfWeek(subDays(new Date(), i * 7), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekLabel = format(weekStart, "M/d", { locale: ja }) + "〜";
    let totalRate = 0, dayCount = 0;
    for (let d = 0; d < 7; d++) {
      const date = format(new Date(weekStart.getTime() + d * 86400000), "yyyy-MM-dd");
      const catMap = dailyHours.get(date) ?? new Map();
      const totalTarget = goals.reduce((sum, g) => sum + g.target_hours, 0);
      const totalActual = goals.reduce((sum, g) => sum + (catMap.get(g.category_id ?? null) ?? 0), 0);
      totalRate += totalTarget > 0 ? Math.min(totalActual / totalTarget, 1.0) : 0;
      dayCount++;
    }
    weekly.push({ week: weekLabel, rate: dayCount > 0 ? totalRate / dayCount : 0 });
  }

  // 月別達成率（過去3ヶ月）
  const monthly: { month: string; rate: number }[] = [];
  for (let i = 2; i >= 0; i--) {
    const monthDate = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const monthLabel = format(monthStart, "yyyy年M月", { locale: ja });
    let totalRate = 0, dayCount = 0;
    for (let d = monthStart; d <= monthEnd; d = new Date(d.getTime() + 86400000)) {
      const date = format(d, "yyyy-MM-dd");
      const catMap = dailyHours.get(date) ?? new Map();
      const totalTarget = goals.reduce((sum, g) => sum + g.target_hours, 0);
      const totalActual = goals.reduce((sum, g) => sum + (catMap.get(g.category_id ?? null) ?? 0), 0);
      totalRate += totalTarget > 0 ? Math.min(totalActual / totalTarget, 1.0) : 0;
      dayCount++;
    }
    monthly.push({ month: monthLabel, rate: dayCount > 0 ? totalRate / dayCount : 0 });
  }

  return NextResponse.json({ daily, weekly, monthly });
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { format, parseISO, eachDayOfInterval, startOfWeek, endOfWeek } from "date-fns";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") ?? "period"; // period | cumulative
  const start = searchParams.get("start") ?? format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const end = searchParams.get("end") ?? format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  // カテゴリー取得
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("created_at");

  // 記録取得
  const { data: records } = await supabase
    .from("records")
    .select("*")
    .eq("user_id", user.id)
    .gte("start_time", `${start}T00:00:00Z`)
    .lte("end_time", `${end}T23:59:59Z`)
    .order("start_time");

  // 全体デイリー目標取得（破線用）
  const { data: overallGoal } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .eq("type", "daily")
    .is("category_id", null)
    .limit(1)
    .single();

  // 期間目標取得（累積モード用）
  const { data: periodGoals } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .eq("type", "period")
    .not("deadline", "is", null);

  // 日付ラベル生成
  const days = eachDayOfInterval({
    start: new Date(start + "T00:00:00"),
    end: new Date(end + "T00:00:00"),
  });
  const labels = days.map((d) => format(d, "M/d"));

  // カテゴリー別日次時間集計
  const catHours = new Map<string, number[]>();
  categories?.forEach((cat) => catHours.set(cat.id, new Array(days.length).fill(0)));

  for (const record of records ?? []) {
    const dateStr = format(parseISO(record.start_time), "yyyy-MM-dd");
    const dayIdx = days.findIndex((d) => format(d, "yyyy-MM-dd") === dateStr);
    if (dayIdx === -1) continue;
    const hours = (new Date(record.end_time).getTime() - new Date(record.start_time).getTime()) / (1000 * 60 * 60);
    const arr = catHours.get(record.category_id);
    if (arr) arr[dayIdx] += hours;
  }

  let datasets = categories?.map((cat) => {
    const data = catHours.get(cat.id) ?? [];
    return {
      label: cat.name,
      data: mode === "cumulative"
        ? data.reduce<number[]>((acc, v, i) => { acc.push((acc[i - 1] ?? 0) + v); return acc; }, [])
        : data,
      backgroundColor: cat.color + "cc",
      borderColor: cat.color,
      fill: true,
      categoryId: cat.id,
    };
  }) ?? [];

  // WhatPulse キータイプ数
  const { data: whatpulseStats } = await supabase
    .from("whatpulse_daily_stats")
    .select("date, total_keys")
    .eq("user_id", user.id)
    .gte("date", start)
    .lte("date", end);

  const keypressMap = new Map<string, number>(
    (whatpulseStats ?? []).map((s: any) => [s.date, s.total_keys])
  );
  const keypressRaw = days.map((d) => keypressMap.get(format(d, "yyyy-MM-dd")) ?? 0);
  const keypressData = mode === "cumulative"
    ? keypressRaw.reduce<number[]>((acc, v, i) => { acc.push((acc[i - 1] ?? 0) + v); return acc; }, [])
    : keypressRaw;

  return NextResponse.json({
    labels,
    datasets,
    overallGoal: overallGoal?.target_hours ?? null,
    periodGoals: periodGoals?.map((g) => ({
      start: g.created_at,
      end: g.deadline,
      hours: g.target_hours,
    })) ?? [],
    keypressData,
  });
}

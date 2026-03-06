import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { format, startOfWeek, endOfWeek } from "date-fns";

export const runtime = "edge";

/** UTC ISO文字列をローカル日付文字列 "YYYY-MM-DD" に変換 */
function toLocalDateStr(utcIso: string, tzOffsetMinutes: number): string {
  const ms = new Date(utcIso).getTime() + tzOffsetMinutes * 60_000;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** ローカル日付文字列の配列を生成（start〜end inclusive） */
function generateDays(startStr: string, endStr: string): string[] {
  const days: string[] = [];
  const cur = new Date(startStr + "T12:00:00Z"); // noon UTC で1日ずつ安全にインクリメント
  const endMs = new Date(endStr + "T12:00:00Z").getTime();
  while (cur.getTime() <= endMs) {
    days.push(format(cur, "yyyy-MM-dd"));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

export async function GET(req: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") ?? "period";
  const start = searchParams.get("start") ?? format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const end = searchParams.get("end") ?? format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const tzOffset = parseInt(searchParams.get("tz") ?? "0", 10); // UTC+X の分数（JST=540）

  // ローカル日付の 00:00〜23:59 を UTC に変換（クエリ用）
  const startUTC = new Date(Date.parse(start + "T00:00:00Z") - tzOffset * 60_000).toISOString();
  const endUTC = new Date(Date.parse(end + "T23:59:59Z") - tzOffset * 60_000).toISOString();

  // カテゴリー取得
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("created_at");

  // 記録取得（ローカル境界を UTC に変換した範囲で）
  const { data: records } = await supabase
    .from("records")
    .select("*")
    .eq("user_id", user.id)
    .gte("start_time", startUTC)
    .lte("end_time", endUTC)
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

  // ローカル日付リストとラベル生成
  const days = generateDays(start, end);
  const labels = days.map((d) => {
    const [, m, day] = d.split("-");
    return `${parseInt(m)}/${parseInt(day)}`;
  });

  // カテゴリー別日次時間集計（ローカル日付基準）
  const catHours = new Map<string, number[]>();
  categories?.forEach((cat) => catHours.set(cat.id, new Array(days.length).fill(0)));

  for (const record of records ?? []) {
    const dateStr = toLocalDateStr(record.start_time, tzOffset);
    const dayIdx = days.indexOf(dateStr);
    if (dayIdx === -1) continue;
    const hours = (new Date(record.end_time).getTime() - new Date(record.start_time).getTime()) / (1000 * 60 * 60);
    const arr = catHours.get(record.category_id);
    if (arr) arr[dayIdx] += hours;
  }

  const datasets = categories?.map((cat) => {
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

  // WhatPulse キータイプ数（日付はローカルで保存済みのため変換不要）
  const { data: whatpulseStats } = await supabase
    .from("whatpulse_daily_stats")
    .select("date, total_keys")
    .eq("user_id", user.id)
    .gte("date", start)
    .lte("date", end);

  const keypressMap = new Map<string, number>(
    (whatpulseStats ?? []).map((s: any) => [s.date, s.total_keys])
  );
  const keypressRaw = days.map((d) => keypressMap.get(d) ?? 0);
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

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { format } from "date-fns";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? format(new Date(), "yyyy-MM-dd");

  const { data: records } = await supabase
    .from("records")
    .select("*, categories(*)")
    .eq("user_id", user.id)
    .gte("start_time", `${date}T00:00:00+00:00`)
    .lte("end_time", `${date}T23:59:59+00:00`)
    .order("start_time");

  // 24時間 = 86400秒
  const segments = (records ?? []).map((r) => {
    const start = new Date(r.start_time);
    const end = new Date(r.end_time);
    const startSec = start.getUTCHours() * 3600 + start.getUTCMinutes() * 60 + start.getUTCSeconds();
    const endSec = end.getUTCHours() * 3600 + end.getUTCMinutes() * 60 + end.getUTCSeconds();
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    return {
      categoryId: r.category_id,
      categoryName: (r.categories as { name: string } | null)?.name ?? "不明",
      color: (r.categories as { color: string } | null)?.color ?? "#888",
      startAngle: (startSec / 86400) * 360 - 90,
      endAngle: (endSec / 86400) * 360 - 90,
      hours,
    };
  });

  const totalHours = segments.reduce((sum, s) => sum + s.hours, 0);

  return NextResponse.json({ segments, totalHours, date });
}

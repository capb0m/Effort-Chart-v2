import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { format } from "date-fns";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? format(new Date(), "yyyy-MM-dd");
  // クライアントからローカル変換済みのUTC start/end を受け取る（なければ旧来のUTC固定にフォールバック）
  const start = searchParams.get("start") ?? `${date}T00:00:00Z`;
  const end = searchParams.get("end") ?? `${date}T23:59:59Z`;

  const { data: records } = await supabase
    .from("records")
    .select("*, categories(*)")
    .eq("user_id", user.id)
    .gte("start_time", start)
    .lte("end_time", end)
    .order("start_time");

  const segments = (records ?? []).map((r) => {
    const hours = (new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) / (1000 * 60 * 60);
    return {
      categoryId: r.category_id,
      categoryName: (r.categories as { name: string } | null)?.name ?? "不明",
      color: (r.categories as { color: string } | null)?.color ?? "#888",
      startTime: r.start_time,
      endTime: r.end_time,
      hours,
    };
  });

  const totalHours = segments.reduce((sum, s) => sum + s.hours, 0);

  return NextResponse.json({ segments, totalHours, date });
}

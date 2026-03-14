import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  const [categoriesRes, recordsRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, color")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("name"),
    supabase
      .from("records")
      .select("category_id, start_time, end_time")
      .eq("user_id", user.id),
  ]);

  if (categoriesRes.error) return NextResponse.json({ error: categoriesRes.error.message }, { status: 500 });
  if (recordsRes.error) return NextResponse.json({ error: recordsRes.error.message }, { status: 500 });

  const categories = (categoriesRes.data ?? []) as { id: string; name: string; color: string }[];
  const records = (recordsRes.data ?? []) as { category_id: string; start_time: string; end_time: string }[];

  const totalMsMap = new Map<string, number>();
  for (const r of records) {
    const ms = new Date(r.end_time).getTime() - new Date(r.start_time).getTime();
    if (ms > 0) {
      totalMsMap.set(r.category_id, (totalMsMap.get(r.category_id) ?? 0) + ms);
    }
  }

  const totals = categories
    .map((cat) => ({
      categoryId: cat.id,
      categoryName: cat.name,
      color: cat.color,
      totalHours: (totalMsMap.get(cat.id) ?? 0) / 3_600_000,
    }))
    .sort((a, b) => b.totalHours - a.totalHours);

  return NextResponse.json({ totals });
}

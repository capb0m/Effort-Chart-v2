import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { validateRecord } from "@/lib/utils/validation";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const limit = parseInt(searchParams.get("limit") ?? "100", 10);

  let query = supabase
    .from("records")
    .select("*, categories(*)")
    .eq("user_id", user.id)
    .order("start_time", { ascending: false })
    .limit(limit);

  if (start) query = query.gte("start_time", start);
  if (end) query = query.lte("end_time", end);

  const { data, error: dbError } = await query;
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  const body = await req.json();
  const { category_id, start_time, end_time } = body;

  if (!category_id || !start_time || !end_time) {
    return NextResponse.json({ error: "category_id, start_time, end_time は必須です" }, { status: 400 });
  }

  const validation = validateRecord(start_time, end_time);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // 重複チェック
  const { data: existing } = await supabase
    .from("records")
    .select("id")
    .eq("user_id", user.id)
    .lt("start_time", end_time)
    .gt("end_time", start_time)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "同じ時間帯に既存の記録があります" }, { status: 400 });
  }

  const { data, error: dbError } = await supabase
    .from("records")
    .insert({ user_id: user.id, category_id, start_time, end_time })
    .select("*, categories(*)")
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

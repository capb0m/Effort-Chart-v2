import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";

export const runtime = "edge";

const MAX_TIMER_HOURS = 10;

export async function GET(req: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  const { data } = await supabase
    .from("timer_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json(data ?? null);
}

export async function POST(req: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  // 既存のアクティブなタイマーを削除（制約違反を防ぐため）
  await supabase
    .from("timer_sessions")
    .delete()
    .eq("user_id", user.id)
    .eq("is_active", true);

  const { data, error: dbError } = await supabase
    .from("timer_sessions")
    .insert({
      user_id: user.id,
      start_time: new Date().toISOString(),
      is_active: true,
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { category_id } = body;

  // アクティブなタイマーを取得
  const { data: session } = await supabase
    .from("timer_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!session) {
    return NextResponse.json({ error: "アクティブなタイマーがありません" }, { status: 404 });
  }

  const startTime = new Date(session.start_time);
  const endTime = new Date();
  const diffHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

  // 10時間上限チェック
  const clampedEnd = diffHours > MAX_TIMER_HOURS
    ? new Date(startTime.getTime() + MAX_TIMER_HOURS * 3600000)
    : endTime;

  // タイマーセッションを削除（is_active更新ではなく物理削除）
  const { error: stopError } = await supabase
    .from("timer_sessions")
    .delete()
    .eq("id", session.id);

  if (stopError) return NextResponse.json({ error: stopError.message }, { status: 500 });

  // カテゴリーが指定された場合は記録として保存
  if (category_id) {
    const { data: record, error: recordError } = await supabase
      .from("records")
      .insert({
        user_id: user.id,
        category_id,
        start_time: session.start_time,
        end_time: clampedEnd.toISOString(),
      })
      .select("*, categories(*)")
      .single();

    if (recordError) return NextResponse.json({ error: recordError.message }, { status: 500 });
    return NextResponse.json({ session, record });
  }

  return NextResponse.json({ session, record: null });
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { validateRecord } from "@/lib/utils/validation";

export const runtime = "edge";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  if (body.start_time && body.end_time) {
    const validation = validateRecord(body.start_time, body.end_time);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // 重複チェック（自分自身を除く）
    const { data: existing } = await supabase
      .from("records")
      .select("id")
      .eq("user_id", user.id)
      .neq("id", id)
      .lt("start_time", body.end_time)
      .gt("end_time", body.start_time)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "同じ時間帯に既存の記録があります" }, { status: 400 });
    }
  }

  const { data, error: dbError } = await supabase
    .from("records")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*, categories(*)")
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  const { id } = await params;

  const { error: dbError } = await supabase
    .from("records")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

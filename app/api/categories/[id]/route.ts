import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";

export const runtime = "edge";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const { data, error: dbError } = await supabase
    .from("categories")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  const { id } = await params;

  // 論理削除（アーカイブ）
  const { error: dbError } = await supabase
    .from("categories")
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

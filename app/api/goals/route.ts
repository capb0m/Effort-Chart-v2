import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  const { data, error: dbError } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  const body = await req.json();
  const { category_id, type, target_hours, deadline } = body;

  if (!type || !target_hours) {
    return NextResponse.json({ error: "type と target_hours は必須です" }, { status: 400 });
  }
  if (type === "period" && !deadline) {
    return NextResponse.json({ error: "期間目標には deadline が必要です" }, { status: 400 });
  }

  const { data, error: dbError } = await supabase
    .from("goals")
    .insert({
      user_id: user.id,
      category_id: category_id ?? null,
      type,
      target_hours,
      deadline: deadline ?? null,
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

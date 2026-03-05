import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { data, error: dbError } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const body = await req.json();
  const { name, color } = body;

  if (!name || !color) {
    return NextResponse.json({ error: "name と color は必須です" }, { status: 400 });
  }

  const { data, error: dbError } = await supabase
    .from("categories")
    .insert({ user_id: user.id, name, color, is_archived: false })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

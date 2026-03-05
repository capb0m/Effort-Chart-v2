import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  const { data } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json(data ?? null);
}

export async function PATCH(req: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  const body = await req.json();
  const updates = {
    whatpulse_username: body.whatpulse_username ?? null,
    whatpulse_api_key: body.whatpulse_api_key ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error: dbError } = await supabase
    .from("user_profiles")
    .upsert({ user_id: user.id, ...updates }, { onConflict: "user_id" })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}

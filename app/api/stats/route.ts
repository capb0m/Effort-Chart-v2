import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  const [{ data: whatpulse }, { data: records }] = await Promise.all([
    supabase.from("whatpulse_daily_stats").select("total_keys").eq("user_id", user.id),
    supabase.from("records").select("start_time, end_time").eq("user_id", user.id),
  ]);

  const totalKeys = (whatpulse ?? []).reduce((sum: number, r: any) => sum + (r.total_keys ?? 0), 0);
  const totalHours = (records ?? []).reduce((sum: number, r: any) => {
    const h = (new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) / (1000 * 60 * 60);
    return sum + (isNaN(h) ? 0 : h);
  }, 0);

  return NextResponse.json({ totalKeys, totalHours });
}

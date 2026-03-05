import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { ACHIEVEMENT_DEFINITIONS } from "@/lib/achievements/definitions";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { user, supabase, error } = await getAuthenticatedUser(req);
  if (error || !user || !supabase) return NextResponse.json({ error }, { status: 401 });

  const { data: unlocked } = await supabase
    .from("user_achievements")
    .select("*")
    .eq("user_id", user.id);

  const unlockedMap = new Map((unlocked ?? []).map((u: { achievement_id: string; unlocked_at: string }) => [u.achievement_id, u.unlocked_at]));

  const achievements = ACHIEVEMENT_DEFINITIONS.map((def) => ({
    id: def.id,
    name: def.name,
    description: def.description,
    icon: def.icon,
    category: def.category,
    tier: def.tier,
    unlockedAt: unlockedMap.get(def.id) ?? null,
  }));

  return NextResponse.json({ achievements, unlocked: unlocked ?? [] });
}

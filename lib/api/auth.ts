import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

export async function getAuthenticatedUser(req: NextRequest): Promise<{
  user: { id: string; email?: string } | null;
  supabase: SupabaseClient | null;
  error: string | null;
}> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { user: null, supabase: null, error: "Unauthorized" };
  }

  const token = authHeader.slice(7);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return { user: null, supabase: null, error: "Unauthorized" };
  }

  return { user, supabase, error: null };
}

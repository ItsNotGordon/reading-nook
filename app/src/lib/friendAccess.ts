import { createSupabaseServerClient } from "@/lib/supabase/server";
import { viewerFollowsTarget } from "@/lib/socialGraph";

export type LibraryAccessInput = {
  viewerId: string;
  targetId: string;
  targetIsPublic: boolean;
  viewerFollowsTarget: boolean;
};

/**
 * Instagram-style library visibility:
 * - Self always allowed
 * - Public accounts: any signed-in viewer
 * - Private accounts: viewer must follow target (approved one-way follow)
 */
export function canViewLibrary(input: LibraryAccessInput): boolean {
  if (input.viewerId === input.targetId) return true;
  if (input.targetIsPublic) return true;
  return input.viewerFollowsTarget;
}

export async function resolveCanViewLibrary(
  viewerId: string,
  targetId: string,
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
): Promise<boolean> {
  if (viewerId === targetId) return true;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_public")
    .eq("id", targetId)
    .maybeSingle();

  if (!profile) return false;

  const targetIsPublic = Boolean(profile.is_public);
  if (targetIsPublic) return true;

  return viewerFollowsTarget(viewerId, targetId);
}

export async function assertCanViewLibrary(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  viewerId: string,
  targetId: string,
) {
  const allowed = await resolveCanViewLibrary(viewerId, targetId, supabase);
  if (!allowed) {
    return {
      ok: false as const,
      status: 403,
      error: "This library is private.",
    };
  }
  return { ok: true as const };
}

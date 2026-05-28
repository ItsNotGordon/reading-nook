import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, getSupabaseUrl, getSupabaseServiceRoleKey } from "@/lib/supabase/config";
import { normalizeUsername } from "@/lib/username";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ clubId: string }> };

function getServiceClient() {
  if (!isSupabaseConfigured()) return null;
  try {
    return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey());
  } catch {
    return null;
  }
}

export async function POST(request: Request, ctx: Ctx) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { clubId } = await ctx.params;
  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ ok: false }, { status: 503 });

  const raw: unknown = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const b = raw as Record<string, unknown>;
  const username = normalizeUsername(typeof b.username === "string" ? b.username : "");
  if (username.length < 2) {
    return NextResponse.json({ error: "Username is required." }, { status: 400 });
  }

  const { data: club } = await sb
    .from("clubs")
    .select("id, members_can_invite")
    .eq("id", clubId)
    .single();
  if (!club) return NextResponse.json({ error: "Club not found." }, { status: 404 });

  const { data: callerMembership } = await sb
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!callerMembership) {
    return NextResponse.json({ error: "You must be a club member to invite." }, { status: 403 });
  }

  const canInvite =
    callerMembership.role === "admin" || Boolean(club.members_can_invite);
  if (!canInvite) {
    return NextResponse.json({ error: "You do not have permission to invite members." }, { status: 403 });
  }

  const { data: targetProfile } = await sb
    .from("profiles")
    .select("id, username")
    .eq("username", username)
    .maybeSingle();

  if (!targetProfile) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (targetProfile.id === user.id) {
    return NextResponse.json({ error: "You cannot invite yourself." }, { status: 400 });
  }

  const { data: existingMember } = await sb
    .from("club_members")
    .select("id")
    .eq("club_id", clubId)
    .eq("user_id", targetProfile.id)
    .maybeSingle();

  if (existingMember) {
    return NextResponse.json({ error: "Already a member." }, { status: 400 });
  }

  const { data: existingInvite } = await sb
    .from("club_invites")
    .select("id, status")
    .eq("club_id", clubId)
    .eq("invitee_id", targetProfile.id)
    .maybeSingle();

  if (existingInvite?.status === "pending") {
    return NextResponse.json({ error: "Invitation already pending." }, { status: 400 });
  }

  const now = new Date().toISOString();

  if (existingInvite) {
    const { error: updateError } = await sb
      .from("club_invites")
      .update({
        status: "pending",
        inviter_id: user.id,
        created_at: now,
      })
      .eq("id", existingInvite.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else {
    const { error: insertError } = await sb.from("club_invites").insert({
      club_id: clubId,
      inviter_id: user.id,
      invitee_id: targetProfile.id,
      status: "pending",
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  await sb.from("notifications").insert({
    user_id: targetProfile.id,
    type: "club_invite",
    club_id: clubId,
    actor_id: user.id,
  });

  return NextResponse.json({ ok: true, username: targetProfile.username, pending: true });
}

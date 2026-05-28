import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, getSupabaseUrl, getSupabaseServiceRoleKey } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ inviteId: string }> };

function getServiceClient() {
  if (!isSupabaseConfigured()) return null;
  try {
    return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey());
  } catch {
    return null;
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { inviteId } = await ctx.params;
  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ ok: false }, { status: 503 });

  const raw: unknown = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const action =
    typeof (raw as Record<string, unknown>).action === "string"
      ? (raw as Record<string, unknown>).action
      : "";

  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "action must be accept or decline." }, { status: 400 });
  }

  const { data: invite } = await sb
    .from("club_invites")
    .select("id, club_id, invitee_id, status")
    .eq("id", inviteId)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  }

  if (invite.invitee_id !== user.id) {
    return NextResponse.json({ error: "Not your invitation." }, { status: 403 });
  }

  if (invite.status !== "pending") {
    return NextResponse.json({ error: "This invitation is no longer pending." }, { status: 409 });
  }

  const now = new Date().toISOString();

  if (action === "accept") {
    const { data: existingMember } = await sb
      .from("club_members")
      .select("id")
      .eq("club_id", invite.club_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingMember) {
      const { error: memberError } = await sb.from("club_members").insert({
        club_id: invite.club_id,
        user_id: user.id,
        role: "member",
        last_feed_seen_at: now,
      });

      if (memberError) {
        return NextResponse.json({ error: memberError.message }, { status: 500 });
      }
    }

    const { error: inviteError } = await sb
      .from("club_invites")
      .update({ status: "accepted" })
      .eq("id", inviteId);

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }
  } else {
    const { error: inviteError } = await sb
      .from("club_invites")
      .update({ status: "declined" })
      .eq("id", inviteId);

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }
  }

  await sb
    .from("notifications")
    .update({ read_at: now })
    .eq("user_id", user.id)
    .eq("club_id", invite.club_id)
    .in("type", ["club_invite", "club_added"])
    .is("read_at", null);

  return NextResponse.json({ ok: true });
}

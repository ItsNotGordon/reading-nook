import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type FriendRow = {
  friendshipId: string;
  userId: string;
  displayName: string;
  tagline: string;
  shareShelves: boolean;
  status: "pending" | "accepted";
  direction: "incoming" | "outgoing";
};

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ friends: [], configured: false });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ friends: [], configured: false });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data: links, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const friends: FriendRow[] = [];
  for (const link of links ?? []) {
    const otherId = link.requester_id === user.id ? link.addressee_id : link.requester_id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, tagline, share_shelves")
      .eq("id", otherId)
      .maybeSingle();

    friends.push({
      friendshipId: link.id,
      userId: otherId,
      displayName: profile?.display_name ?? "Reader",
      tagline: profile?.tagline ?? "",
      shareShelves: Boolean(profile?.share_shelves),
      status: link.status,
      direction: link.addressee_id === user.id && link.status === "pending" ? "incoming" : "outgoing",
    });
  }

  return NextResponse.json({ friends, configured: true });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Friends require Supabase." }, { status: 503 });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Friends require Supabase." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const email =
    typeof body === "object" && body !== null && "email" in body
      ? String((body as { email: unknown }).email).trim().toLowerCase()
      : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  }

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Server missing SUPABASE_SERVICE_ROLE_KEY for invites." },
      { status: 503 },
    );
  }

  const { data: list, error: lookupError } = await admin.auth.admin.listUsers();
  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }

  const target = list.users.find((u) => u.email?.toLowerCase() === email);
  if (!target) {
    return NextResponse.json(
      { error: "No account with that email. They need to sign in once first." },
      { status: 404 },
    );
  }
  if (target.id === user.id) {
    return NextResponse.json({ error: "You cannot add yourself." }, { status: 400 });
  }

  const { error } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: target.id,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Friend request already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Friends require Supabase." }, { status: 503 });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Friends require Supabase." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const friendshipId =
    typeof body === "object" && body !== null && "friendshipId" in body
      ? String((body as { friendshipId: unknown }).friendshipId)
      : "";
  const action =
    typeof body === "object" && body !== null && "action" in body
      ? String((body as { action: unknown }).action)
      : "";

  if (!friendshipId || !["accept", "decline", "cancel"].includes(action)) {
    return NextResponse.json(
      { error: "friendshipId and action (accept|decline|cancel) required." },
      { status: 400 },
    );
  }

  const { data: row, error: fetchError } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .eq("id", friendshipId)
    .maybeSingle();

  if (fetchError || !row) {
    return NextResponse.json({ error: "Friend request not found." }, { status: 404 });
  }
  if (row.status !== "pending") {
    return NextResponse.json({ error: "This request is no longer pending." }, { status: 409 });
  }

  if (action === "accept") {
    if (row.addressee_id !== user.id) {
      return NextResponse.json({ error: "Only the recipient can accept." }, { status: 403 });
    }
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "decline") {
    if (row.addressee_id !== user.id) {
      return NextResponse.json({ error: "Only the recipient can decline." }, { status: 403 });
    }
  } else if (action === "cancel") {
    if (row.requester_id !== user.id) {
      return NextResponse.json({ error: "Only the sender can cancel." }, { status: 403 });
    }
  }

  const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

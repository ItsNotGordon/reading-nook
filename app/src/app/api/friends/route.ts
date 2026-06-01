import { NextResponse } from "next/server";
import {
  findFriendshipBetween,
  friendshipRequestWithViewer,
} from "@/lib/friendshipStatus";
import {
  areMutualFollows,
  countFollowDirections,
  insertFollow,
  listMutualFollowsForUser,
  viewerFollowsTarget,
} from "@/lib/socialGraph";
import { normalizeUsername } from "@/lib/username";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type FriendRow = {
  friendshipId: string;
  userId: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  tagline: string;
  status: "friend" | "pending";
  direction?: "incoming" | "outgoing";
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
  type FriendshipLinkRow = {
    id: string;
    requester_id: string;
    addressee_id: string;
    status: string;
  };
  const linkByOther = new Map<string, FriendshipLinkRow>();
  for (const link of links ?? []) {
    const otherId = link.requester_id === user.id ? link.addressee_id : link.requester_id;
    linkByOther.set(otherId, link);
    if (link.status !== "pending") continue;

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, display_name, tagline, avatar_url")
      .eq("id", otherId)
      .maybeSingle();

    friends.push({
      friendshipId: link.id,
      userId: otherId,
      username: profile?.username ?? null,
      displayName: profile?.display_name ?? "Reader",
      avatarUrl: profile?.avatar_url ?? null,
      tagline: profile?.tagline ?? "",
      status: "pending",
      direction: link.requester_id === user.id ? "outgoing" : "incoming",
    });
  }

  const mutual = await listMutualFollowsForUser(user.id);
  for (const person of mutual) {
    const link = linkByOther.get(person.userId);
    friends.push({
      friendshipId: link?.id ?? "",
      userId: person.userId,
      username: person.username,
      displayName: person.displayName,
      avatarUrl: person.avatarUrl,
      tagline: person.tagline,
      status: "friend",
    });
  }

  const counts = await countFollowDirections(user.id);

  return NextResponse.json({
    friends,
    configured: true,
    followingCount: counts.following,
    followersCount: counts.followers,
  });
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

  const userId =
    typeof body === "object" && body !== null && "userId" in body
      ? String((body as { userId: unknown }).userId).trim()
      : "";
  const username =
    typeof body === "object" && body !== null && "username" in body
      ? normalizeUsername(String((body as { username: unknown }).username))
      : "";

  let targetId = userId;
  let targetIsPublic = false;
  if (!targetId && username) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, is_public")
      .eq("username", username)
      .maybeSingle();
    if (!profile) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    targetId = profile.id;
    targetIsPublic = Boolean(profile.is_public);
  } else if (targetId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_public")
      .eq("id", targetId)
      .maybeSingle();
    if (!profile) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    targetIsPublic = Boolean(profile.is_public);
  }

  if (!targetId) {
    return NextResponse.json({ error: "userId or username required." }, { status: 400 });
  }
  if (targetId === user.id) {
    return NextResponse.json({ error: "You cannot add yourself." }, { status: 400 });
  }

  if (targetIsPublic) {
    return NextResponse.json(
      { error: "This account is public. Use Follow on their profile instead." },
      { status: 400 },
    );
  }

  if (await viewerFollowsTarget(user.id, targetId)) {
    return NextResponse.json({ error: "You already follow this account." }, { status: 409 });
  }

  const { links, error: linkError } = await findFriendshipBetween(supabase, user.id, targetId);
  if (linkError) {
    return NextResponse.json({ error: linkError }, { status: 500 });
  }

  if (await areMutualFollows(user.id, targetId)) {
    return NextResponse.json({ error: "You are already friends." }, { status: 409 });
  }

  const { relationship, friendshipId } = friendshipRequestWithViewer(user.id, targetId, links);
  if (relationship === "pending_outgoing") {
    return NextResponse.json({ error: "Friend request already sent." }, { status: 409 });
  }
  if (relationship === "pending_incoming" && friendshipId) {
    return NextResponse.json(
      { error: "They already sent you a request. Accept it from your invites." },
      { status: 409 },
    );
  }

  const { error } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: targetId,
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
    await insertFollow(row.requester_id, row.addressee_id);
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

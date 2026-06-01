import { NextResponse } from "next/server";
import { canViewLibrary } from "@/lib/friendAccess";
import { countAcceptedFriendships } from "@/lib/friendshipCounts";
import { findFriendshipBetween, resolveSocialRelationship } from "@/lib/friendshipStatus";
import { areMutualFollows, viewerFollowsTarget } from "@/lib/socialGraph";
import { normalizeUsername } from "@/lib/username";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(
  _request: Request,
  context: { params: Promise<{ username: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Profiles require Supabase." }, { status: 503 });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Profiles require Supabase." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { username: raw } = await context.params;
  const username = normalizeUsername(raw);
  if (!username) {
    return NextResponse.json({ error: "Username required." }, { status: 400 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, tagline, avatar_url, is_public")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const { links, error: linkError } = await findFriendshipBetween(supabase, user.id, profile.id);
  if (linkError) {
    return NextResponse.json({ error: linkError }, { status: 500 });
  }

  const viewerFollows = await viewerFollowsTarget(user.id, profile.id);
  const targetFollowsViewer = await viewerFollowsTarget(profile.id, user.id);
  const mutualFollow = await areMutualFollows(user.id, profile.id);

  const { relationship, friendshipId } = resolveSocialRelationship(
    user.id,
    profile.id,
    links,
    mutualFollow,
    viewerFollows,
    targetFollowsViewer,
  );

  const counts = await countAcceptedFriendships(supabase, profile.id);

  const isPublic = Boolean(profile.is_public);
  const canViewCounts =
    relationship === "friends" || isPublic || viewerFollows || targetFollowsViewer;
  const canViewLibraryFlag = canViewLibrary({
    viewerId: user.id,
    targetId: profile.id,
    targetIsPublic: isPublic,
    viewerFollowsTarget: viewerFollows,
  });

  return NextResponse.json({
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name ?? "Reader",
    avatarUrl: profile.avatar_url ?? null,
    tagline: profile.tagline ?? "",
    isPublic,
    canViewLibrary: canViewLibraryFlag,
    relationship,
    friendshipId,
    viewerFollows,
    targetFollowsViewer,
    followingCount: canViewCounts ? counts.following : null,
    followersCount: canViewCounts ? counts.followers : null,
  });
}

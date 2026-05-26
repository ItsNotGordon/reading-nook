import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function sanitizeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/profile";
  return raw;
}

function loginRedirect(origin: string, next: string, errorMessage: string): NextResponse {
  const params = new URLSearchParams({ next, error: errorMessage });
  return NextResponse.redirect(`${origin}/login?${params.toString()}`);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = sanitizeNextPath(searchParams.get("next"));

  const oauthError = searchParams.get("error");
  if (oauthError) {
    const description = searchParams.get("error_description") ?? oauthError;
    return loginRedirect(origin, next, description);
  }

  const code = searchParams.get("code");
  if (code) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return loginRedirect(origin, next, "Cloud sign-in is not configured.");
    }
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return loginRedirect(origin, next, error.message);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}

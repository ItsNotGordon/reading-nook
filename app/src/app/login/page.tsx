import { LoginPageClient } from "./LoginPageClient";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

function sanitizeNextPath(raw: string | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/profile";
  return raw;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params.next);
  const authError = params.error?.trim() || null;
  return <LoginPageClient nextPath={nextPath} authError={authError} />;
}

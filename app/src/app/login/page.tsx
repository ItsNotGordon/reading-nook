import { LoginPageClient } from "./LoginPageClient";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

function sanitizeNextPath(raw: string | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/profile";
  return raw;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params.next);
  return <LoginPageClient nextPath={nextPath} />;
}

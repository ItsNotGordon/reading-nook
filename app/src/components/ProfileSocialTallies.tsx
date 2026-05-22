type ProfileSocialTalliesProps = {
  followingCount: number | null;
  followersCount: number | null;
  /** When null counts and user is not signed in. */
  gated?: boolean;
};

export function ProfileSocialTallies({
  followingCount,
  followersCount,
  gated = false,
}: ProfileSocialTalliesProps) {
  if (gated) {
    return (
      <p className="rounded-xl border border-border/80 bg-card-surface/90 px-3 py-2.5 text-center text-xs text-foreground-muted backdrop-blur-[1px]">
        Sign in to see friends
      </p>
    );
  }

  const display = (n: number | null) => (n == null ? "—" : String(n));

  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card-surface/95 p-3 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
      <div className="rounded-xl border border-border/80 bg-background px-3 py-2.5 text-center">
        <p className="text-2xl font-semibold tabular-nums text-foreground">
          {display(followingCount)}
        </p>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground-muted">
          Following
        </p>
      </div>
      <div className="rounded-xl border border-border/80 bg-background px-3 py-2.5 text-center">
        <p className="text-2xl font-semibold tabular-nums text-foreground">
          {display(followersCount)}
        </p>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground-muted">
          Followers
        </p>
      </div>
    </div>
  );
}

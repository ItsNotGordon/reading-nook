type ProfileSocialTalliesProps = {
  followingCount: number | null;
  followersCount: number | null;
  /** When null counts and user is not signed in. */
  gated?: boolean;
  onFollowingPress?: () => void;
  onFollowersPress?: () => void;
};

const cellClass =
  "w-full rounded-xl border border-border/80 bg-background px-3 py-2.5 text-center transition-colors hover:border-accent/40 hover:bg-accent-soft/20 active:bg-accent-soft/40 disabled:cursor-default disabled:opacity-60 disabled:hover:border-border/80 disabled:hover:bg-background";

export function ProfileSocialTallies({
  followingCount,
  followersCount,
  gated = false,
  onFollowingPress,
  onFollowersPress,
}: ProfileSocialTalliesProps) {
  if (gated) {
    return (
      <p className="rounded-xl border border-border/80 bg-card-surface/90 px-3 py-2.5 text-center text-xs text-foreground-muted backdrop-blur-[1px]">
        Sign in to see friends
      </p>
    );
  }

  const display = (n: number | null) => (n == null ? "—" : String(n));
  const followingInteractive = Boolean(onFollowingPress && followingCount != null);
  const followersInteractive = Boolean(onFollowersPress && followersCount != null);

  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card-surface/95 p-3 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
      <button
        type="button"
        onClick={onFollowingPress}
        disabled={!followingInteractive}
        className={cellClass}
        aria-label="View following"
      >
        <p className="text-2xl font-semibold tabular-nums text-foreground">
          {display(followingCount)}
        </p>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground-muted">
          Following
        </p>
      </button>
      <button
        type="button"
        onClick={onFollowersPress}
        disabled={!followersInteractive}
        className={cellClass}
        aria-label="View followers"
      >
        <p className="text-2xl font-semibold tabular-nums text-foreground">
          {display(followersCount)}
        </p>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground-muted">
          Followers
        </p>
      </button>
    </div>
  );
}

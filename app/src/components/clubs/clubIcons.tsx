/** Small inline icons for club detail UI (reference Option A). */

function iconClass(size: string, className?: string): string {
  return [size, "shrink-0", className].filter(Boolean).join(" ");
}

type IconProps = { className?: string };

export function IconLock({ className }: IconProps) {
  return (
    <svg
      className={iconClass("h-3.5 w-3.5", className)}
      viewBox="0 0 20 20"
      fill="currentColor"
      width={14}
      height={14}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function IconGlobe({ className }: IconProps) {
  return (
    <svg
      className={iconClass("h-3.5 w-3.5", className)}
      viewBox="0 0 20 20"
      fill="currentColor"
      width={14}
      height={14}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912 2.706C6.176 11.398 6.09 12.76 6.017 14H4.065a6.005 6.005 0 01-.733-5.973zM10 16c.988 0 1.93-.142 2.787-.41a11.957 11.957 0 01-.593-2.764 9.979 9.979 0 00-4.194 0 11.957 11.957 0 01-.593 2.764A7.967 7.967 0 0010 16zm6.965-2a6.005 6.005 0 00-.733-5.973 6.012 6.012 0 011.912-2.706c.167.625.302 1.29.393 1.973H13.98c-.073-1.24-.16-2.602-.347-3.973A7.967 7.967 0 0110 4c-.988 0-1.93.142-2.787.41.187 1.371.274 2.733.347 3.973H6.017c.09-.683.226-1.348.393-1.973a6.012 6.012 0 011.912 2.706C6.176 8.602 6.09 9.964 6.017 11.25H4.065a6.005 6.005 0 00.733 5.973A7.967 7.967 0 0010 16a7.967 7.967 0 005.202-1.973z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Hero metadata row — slightly larger than badge icons. */
export function IconUsers({ className }: IconProps) {
  return (
    <svg
      className={iconClass("h-4 w-4", className)}
      viewBox="0 0 20 20"
      fill="currentColor"
      width={16}
      height={16}
      aria-hidden
    >
      <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.27.92-.569 1.175A6.002 6.002 0 017 18a6.002 6.002 0 01-5.385-1.572zM14.5 16.5a4.5 4.5 0 10-.846-2.676 4.502 4.502 0 001.043 2.676A6.002 6.002 0 0117 18h-2.5z" />
    </svg>
  );
}

export function IconMail({ className }: IconProps) {
  return (
    <svg
      className={iconClass("h-4 w-4", className)}
      viewBox="0 0 20 20"
      fill="currentColor"
      width={16}
      height={16}
      aria-hidden
    >
      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
    </svg>
  );
}

export function IconChevronDown({ className }: IconProps) {
  return (
    <svg
      className={iconClass("h-3.5 w-3.5", className)}
      viewBox="0 0 20 20"
      fill="currentColor"
      width={14}
      height={14}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function IconOpenBook({ className }: IconProps) {
  return (
    <svg
      className={iconClass("h-4 w-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      width={16}
      height={16}
      aria-hidden
    >
      <path d="M3.5 6.5c2.8-1.5 6.2-1.6 8.5-.2v12.3c-2.3-1.4-5.7-1.3-8.5.2V6.5Z" strokeLinejoin="round" />
      <path d="M20.5 6.5c-2.8-1.5-6.2-1.6-8.5-.2v12.3c2.3-1.4 5.7-1.3 8.5.2V6.5Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconChat({ className }: IconProps) {
  return (
    <svg
      className={iconClass("h-4 w-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      width={16}
      height={16}
      aria-hidden
    >
      <path
        d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconUserPlus({ className }: IconProps) {
  return (
    <svg
      className={iconClass("h-3.5 w-3.5", className)}
      viewBox="0 0 20 20"
      fill="currentColor"
      width={14}
      height={14}
      aria-hidden
    >
      <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 00-6 6h2a4 4 0 018 0h2a6 6 0 00-6-6zM16 7a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1V8a1 1 0 011-1z" />
    </svg>
  );
}

export function IconChevronRight({ className }: IconProps) {
  return (
    <svg
      className={iconClass("h-4 w-4", className)}
      viewBox="0 0 20 20"
      fill="currentColor"
      width={16}
      height={16}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}

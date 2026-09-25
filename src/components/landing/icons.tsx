type IconProps = { className?: string };

function StrokeIcon({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className ?? ""}`}
    >
      {children}
    </svg>
  );
}

export function LogoIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M3 17c2 0 2-1.5 4.5-1.5S10 17 12 17s2-1.5 4.5-1.5S19 17 21 17" />
      <path d="M5 13l4-7 3 5 2-3 5 5" />
    </StrokeIcon>
  );
}

export function ChatIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.9-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5z" />
    </StrokeIcon>
  );
}

export function PinIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </StrokeIcon>
  );
}

export function PinPlusIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z" />
      <path d="M12 7v5M9.5 9.5h5" />
    </StrokeIcon>
  );
}

export function ArrowIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </StrokeIcon>
  );
}

export function ChevronIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M9 6l6 6-6 6" />
    </StrokeIcon>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M12 5v14M5 12h14" />
    </StrokeIcon>
  );
}

export function BulbIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
    </StrokeIcon>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </StrokeIcon>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </StrokeIcon>
  );
}

export function CoffeeIcon({ className }: IconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z" />
      <path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17" />
      <path d="M8 3v3M12 3v3" />
    </StrokeIcon>
  );
}

export function Monogram({ className }: IconProps) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-[#D8CDBA] font-landing-display font-semibold text-[#1D2A2E] ${className ?? ""}`}
    >
      A
    </span>
  );
}

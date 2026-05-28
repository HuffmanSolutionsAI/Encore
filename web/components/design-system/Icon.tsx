// Lucide-style icon set, inlined (matches the design handoff — no emoji,
// consistent 1.75 stroke). `currentColor` so they inherit text color.

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

function stroke(size: number, className: string | undefined, style: React.CSSProperties | undefined, children: React.ReactNode) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
    >
      {children}
    </svg>
  );
}

function fill(size: number, className: string | undefined, style: React.CSSProperties | undefined, children: React.ReactNode) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden>
      {children}
    </svg>
  );
}

export const Icon = {
  Home: ({ size = 20, className, style }: IconProps) =>
    stroke(size, className, style, <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5Z" />),
  Library: ({ size = 20, className, style }: IconProps) =>
    stroke(size, className, style, <><rect x="3" y="3" width="6" height="18" rx="1" /><rect x="10" y="3" width="6" height="18" rx="1" /><path d="M19.5 4.5 22 19l-3.5 1L16 5.5z" /></>),
  Friends: ({ size = 20, className, style }: IconProps) =>
    stroke(size, className, style, <><circle cx="9" cy="8" r="3.5" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M15.5 20c0-2.5 1.5-4 3.5-4" /></>),
  Profile: ({ size = 20, className, style }: IconProps) =>
    stroke(size, className, style, <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></>),
  Search: ({ size = 18, className, style }: IconProps) =>
    stroke(size, className, style, <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  Settings: ({ size = 20, className, style }: IconProps) =>
    stroke(size, className, style, <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.2.7.9 1.2 1.5 1.2H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>),
  ChevronLeft: ({ size = 18, className, style }: IconProps) =>
    stroke(size, className, style, <path d="m15 18-6-6 6-6" />),
  ChevronRight: ({ size = 18, className, style }: IconProps) =>
    stroke(size, className, style, <path d="m9 6 6 6-6 6" />),
  Heart: ({ size = 18, className, style }: IconProps) =>
    stroke(size, className, style, <path d="M19 12.5c1.5-1.5 2.5-3 2.5-5A4 4 0 0 0 17.5 3.5c-2 0-3.5 1-5.5 3-2-2-3.5-3-5.5-3A4 4 0 0 0 2.5 7.5c0 2 1 3.5 2.5 5l7 7 7-7Z" />),
  Pause: ({ size = 18, className, style }: IconProps) =>
    fill(size, className, style, <><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></>),
  Play: ({ size = 18, className, style }: IconProps) =>
    fill(size, className, style, <path d="M7 5v14l13-7L7 5Z" />),
  Skip: ({ size = 18, className, style }: IconProps) =>
    fill(size, className, style, <path d="M5 5v14l9-7L5 5Zm10 0v14h3V5h-3Z" />),
  More: ({ size = 18, className, style }: IconProps) =>
    fill(size, className, style, <><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></>),
  Share: ({ size = 18, className, style }: IconProps) =>
    stroke(size, className, style, <><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 10.8 15.8 7.2M8.2 13.2 15.8 16.8" /></>),
  Bell: ({ size = 20, className, style }: IconProps) =>
    stroke(size, className, style, <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a2 2 0 0 0 3.4 0" /></>),
  Grid: ({ size = 18, className, style }: IconProps) =>
    stroke(size, className, style, <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>),
  List: ({ size = 18, className, style }: IconProps) =>
    stroke(size, className, style, <><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>),
  Logout: ({ size = 18, className, style }: IconProps) =>
    stroke(size, className, style, <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>),
  Plus: ({ size = 18, className, style }: IconProps) =>
    stroke(size, className, style, <path d="M12 5v14M5 12h14" />),
  Check: ({ size = 18, className, style }: IconProps) =>
    stroke(size, className, style, <path d="M5 12.5 10 17l9-10" />),
  Music: ({ size = 18, className, style }: IconProps) =>
    stroke(size, className, style, <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>),
} as const;

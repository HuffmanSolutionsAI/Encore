"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useSession } from "@/lib/auth/session";
import { NowPlayingProvider } from "@/lib/now-playing/context";
import { RateProvider } from "@/components/rating/RateProvider";
import { NowBar } from "@/components/layout/NowBar";
import { GrooveWordmark } from "@/components/design-system/GrooveWordmark";
import { DoubleRule } from "@/components/design-system/DoubleRule";
import { Avatar } from "@/components/design-system/Avatar";
import { Icon } from "@/components/design-system/Icon";
import { BRAND } from "@/components/design-system/tokens";

interface NavItem {
  href: string;
  label: string;
  icon: (p: { size?: number }) => React.ReactNode;
  /** Routes that aren't built yet (M6/M7) render disabled with a "Soon" tag. */
  soon?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: Icon.Home },
  { href: "/library", label: "Library", icon: Icon.Library },
  { href: "/friends", label: "Friends", icon: Icon.Friends },
  { href: "/search", label: "Search", icon: Icon.Search },
];

const BOTTOM_NAV: NavItem[] = [
  { href: "/profile", label: "You", icon: Icon.Profile },
  { href: "/settings", label: "Settings", icon: Icon.Settings },
];

/**
 * The signed-in shell — sidebar nav, slim top bar, scrollable content, and
 * the persistent live Now-playing bar. Wraps every logged-in page.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status.kind === "signed_out") router.replace("/auth/signin");
  }, [status.kind, router]);

  const showChrome = status.kind === "ready";

  // Onboarding renders inside a bare brand frame (no nav yet).
  if (!showChrome) {
    return (
      <div className="min-h-screen bg-page">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </div>
    );
  }

  return (
    <NowPlayingProvider>
      <RateProvider>
        {/* Exactly one viewport tall, no page-level scroll — only #app-scroll
            scrolls, so the sidebar and chrome stay fixed in place. */}
        <div className="flex h-screen w-full overflow-hidden bg-page">
          <Sidebar />
          <main className="flex-1 min-w-0 min-h-0 flex flex-col relative">
            <TopBar />
            <div id="app-scroll" className="flex-1 overflow-y-auto min-h-0">
              <div className="mx-auto w-full max-w-5xl px-6 sm:px-10 py-8 sm:py-12">
                {children}
              </div>
            </div>
            <NowBar />
          </main>
        </div>
      </RateProvider>
    </NowPlayingProvider>
  );
}

// ─────────────────────────── Sidebar ───────────────────────────

function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-[244px] flex-none bg-page border-r border-hair flex flex-col px-[18px] pt-[22px] pb-[18px] relative z-[5]">
      <div className="flex items-center px-1 pb-3.5 overflow-hidden">
        <GrooveWordmark fontSize={23} />
      </div>
      <DoubleRule width={44} className="ml-1 mb-[18px]" />

      <nav className="flex flex-col gap-1.5">
        {PRIMARY_NAV.map((item) => (
          <SidebarItem key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </nav>

      <div className="flex-1" />

      <nav className="flex flex-col gap-1.5 mb-2">
        {BOTTOM_NAV.map((item) => (
          <SidebarItem key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
        <SignOutItem />
      </nav>
    </aside>
  );
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

function SidebarItem({ item, active }: { item: NavItem; active: boolean }) {
  const Ic = item.icon;
  const inner = (
    <span
      className={`relative flex items-center gap-3 w-full rounded-[10px] px-3.5 py-2.5 text-left transition
        ${active ? "bg-surface text-fg" : item.soon ? "text-quiet cursor-default" : "text-muted hover:bg-surface/60 hover:text-fg"}`}
      title={item.soon ? "Coming soon" : undefined}
    >
      {active && (
        <span
          className="absolute -left-[18px] top-1/2 -translate-y-1/2 rounded"
          style={{ width: 3, height: 18, background: BRAND.brass }}
        />
      )}
      <Ic size={20} />
      <span className="text-sm" style={{ fontWeight: active ? 600 : 500, letterSpacing: "-0.005em" }}>
        {item.label}
      </span>
      {item.soon && (
        <span className="ml-auto text-[9.5px] font-bold uppercase tracking-[0.14em] text-quiet">Soon</span>
      )}
    </span>
  );

  if (item.soon) return <div aria-disabled>{inner}</div>;
  return (
    <Link href={item.href} className="block">
      {inner}
    </Link>
  );
}

function SignOutItem() {
  const { signOut } = useSession();
  return (
    <button
      onClick={signOut}
      className="relative flex items-center gap-3 w-full rounded-[10px] px-3.5 py-2.5 text-left text-quiet hover:bg-surface/60 hover:text-fg transition"
    >
      <Icon.Logout size={20} />
      <span className="text-sm font-medium" style={{ letterSpacing: "-0.005em" }}>Sign out</span>
    </button>
  );
}

// ─────────────────────────── Top bar ───────────────────────────

function TopBar() {
  const { status, signOut } = useSession();
  const profile = status.kind === "ready" ? status.profile : undefined;

  return (
    <div
      className="sticky top-0 z-[4] border-b border-hair flex items-center gap-4 px-10 py-5"
      style={{ background: "color-mix(in srgb, var(--e-bg) 88%, transparent)", backdropFilter: "blur(10px)" }}
    >
      {/* Quiet search affordance — opens the album search page. */}
      <Link
        href="/search"
        className="flex items-center gap-2.5 bg-surface border border-hair rounded-[10px] px-3.5 py-2 text-quiet max-w-[460px] flex-1 hover:border-brand transition"
      >
        <Icon.Search size={16} />
        <span className="text-[13.5px]">Search every album…</span>
      </Link>
      <div className="flex-1" />
      {profile && <ProfileMenu handle={profile.handle} displayName={profile.display_name} onSignOut={signOut} />}
    </div>
  );
}

function ProfileMenu({
  handle,
  displayName,
  onSignOut,
}: {
  handle: string;
  displayName: string;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { devMode } = useSession();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} aria-label="Account" aria-expanded={open} className="block rounded-full">
        <Avatar name={displayName} size={36} />
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-56 bg-surface border border-hair rounded-card shadow-warm overflow-hidden z-10">
          <div className="px-4 py-3 border-b border-hair">
            <p className="t-label truncate">{displayName}</p>
            <p className="t-caption truncate">@{handle}</p>
            {devMode && <p className="t-overline mt-1">Dev mode</p>}
          </div>
          <button onClick={onSignOut} className="w-full text-left px-4 py-2 text-sm text-muted hover:bg-page hover:text-fg">
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

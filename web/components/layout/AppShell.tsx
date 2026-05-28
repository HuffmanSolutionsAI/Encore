"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useSession } from "@/lib/auth/session";
import { APP_NAME } from "@/lib/config";

interface AppShellProps {
  children: React.ReactNode;
  /** Optional max-width on the inner content. Default fits library/album. */
  maxWidth?: "narrow" | "wide";
}

/**
 * Signed-in app chrome: top header with brand, primary nav, and a profile
 * menu in the corner. Wraps the home/library/album pages.
 *
 * Onboarding stages render this too (the profile menu is hidden until a
 * profile exists) so the user never sees a layout shift between
 * onboarding → ready.
 */
export function AppShell({ children, maxWidth = "wide" }: AppShellProps) {
  const { status, signOut, devMode } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status.kind === "signed_out") router.replace("/auth/signin");
  }, [status.kind, router]);

  const profile =
    status.kind === "ready"
      ? status.profile
      : status.kind === "onboarding"
        ? status.profile
        : undefined;

  const navLinks = profile ? PRIMARY_NAV : [];

  return (
    <div className="min-h-screen flex flex-col bg-encore">
      <header className="sticky top-0 z-20 bg-encore/85 backdrop-blur border-b border-encore-hairline">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="font-display text-2xl text-encore-accent leading-none">
            {APP_NAME}
          </Link>

          {navLinks.length > 0 && (
            <nav className="flex items-center gap-1 sm:gap-2">
              {navLinks.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                      active
                        ? "bg-encore-surface text-encore"
                        : "text-encore-soft hover:text-encore"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {profile ? (
            <ProfileMenu
              handle={profile.handle}
              displayName={profile.display_name}
              onSignOut={signOut}
              devMode={devMode}
            />
          ) : (
            <span className="w-8" aria-hidden />
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <div
          className={`mx-auto w-full px-4 sm:px-6 py-8 sm:py-10 ${
            maxWidth === "narrow" ? "max-w-xl" : "max-w-5xl"
          }`}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

const PRIMARY_NAV = [
  { href: "/", label: "Now playing" },
  { href: "/library", label: "Library" },
] as const;

function ProfileMenu({
  handle,
  displayName,
  onSignOut,
  devMode,
}: {
  handle: string;
  displayName: string;
  onSignOut: () => void;
  devMode: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-full bg-encore-surface border border-encore-hairline flex items-center justify-center text-encore font-semibold text-sm hover:border-encore-brass focus:outline-none focus-visible:ring-2 focus-visible:ring-encore-brass"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        {initial(displayName)}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 w-56 bg-encore-surface border border-encore-hairline rounded-card shadow-lg overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-encore-hairline">
            <p className="text-encore text-sm font-semibold truncate">{displayName}</p>
            <p className="text-encore-faint text-xs truncate">@{handle}</p>
            {devMode && (
              <p className="text-encore-brass text-[10px] uppercase tracking-wider mt-1">
                Dev mode
              </p>
            )}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={onSignOut}
            className="w-full text-left px-4 py-2 text-sm text-encore-soft hover:bg-encore hover:text-encore"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function initial(name: string): string {
  const trimmed = name.trim();
  return trimmed.length === 0 ? "?" : trimmed[0]!.toUpperCase();
}

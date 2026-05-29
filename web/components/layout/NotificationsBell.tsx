"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { useSession } from "@/lib/auth/session";
import { Icon } from "@/components/design-system/Icon";
import { Avatar } from "@/components/design-system/Avatar";
import type { NotificationItem } from "@/lib/types";

const POLL_MS = 60_000;

/**
 * Bell + dropdown. Polls /notifications once a minute while visible; on open,
 * the list shows and we mark everything read. Suppresses noise — if there's
 * nothing to surface, the bell still appears (just without a badge).
 */
export function NotificationsBell() {
  const { notifications } = useSession();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const { items, unread } = await notifications.list();
      setItems(items);
      setUnread(unread);
    } catch {
      // soft-fail: a transient hiccup shouldn't break the chrome
    }
  }, [notifications]);

  useEffect(() => {
    void load();
    const t = setInterval(load, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      try {
        await notifications.markRead();
        setUnread(0);
      } catch {
        // leave the badge if the mark-read failed
      }
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        className="w-[38px] h-[38px] rounded-full bg-surface border border-hair text-fg flex items-center justify-center hover:border-brand transition"
      >
        <Icon.Bell size={18} />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
            style={{ background: "var(--brass)", color: "#241A12" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-[360px] max-h-[60vh] overflow-y-auto bg-surface border border-hair rounded-card shadow-warm z-10">
          <div className="px-4 py-3 border-b border-hair">
            <p className="t-label">Notifications</p>
          </div>
          {items.length === 0 ? (
            <p className="t-caption px-4 py-6">Nothing here yet. Follow a few people; their ovations land here.</p>
          ) : (
            <ul>
              {items.map((n, i) => (
                <li key={n.id} className={i === 0 ? "" : "border-t border-hair"}>
                  <NotifRow item={n} onClose={() => setOpen(false)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function NotifRow({ item, onClose }: { item: NotificationItem; onClose: () => void }) {
  const who = item.actor_display_name ?? "Someone";
  const handle = item.actor_handle;
  const isOvation = item.kind === "ovation";
  const albumId = isOvation && item.payload?.subject_type === "album" ? item.payload.subject_id : null;
  const href = isOvation && albumId ? `/album/${albumId}` : handle ? `/u/${handle}` : "#";

  return (
    <Link href={href} onClick={onClose} className="flex items-start gap-3 px-4 py-3 hover:bg-page transition">
      <Avatar name={who} size={32} />
      <div className="flex-1 min-w-0">
        <p className="text-fg text-sm" style={{ letterSpacing: "-0.005em" }}>
          <span className="font-semibold">{who}</span>{" "}
          {isOvation ? (
            <span className="t-editorial" style={{ fontSize: 14 }}>gave it an encore.</span>
          ) : (
            <span className="t-editorial" style={{ fontSize: 14 }}>started following you.</span>
          )}
        </p>
        {handle && <p className="t-caption">@{handle} · {relative(item.created_at)}</p>}
      </div>
    </Link>
  );
}

function relative(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.max(1, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

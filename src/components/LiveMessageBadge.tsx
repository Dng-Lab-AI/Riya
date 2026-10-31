"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

const POLL_MS = 8000;

// The message icon in the header, kept live everywhere: it polls the unread count, and when
// it rises it shows a short toast (and a browser notification if the tab is hidden and allowed).
export function LiveMessageBadge({ initialUnread }: { initialUnread: number }) {
  const [unread, setUnread] = useState(initialUnread);
  const [toast, setToast] = useState(false);
  const previous = useRef(initialUnread);
  const pathname = usePathname();

  useEffect(() => {
    let alive = true;
    const toastTimer = { id: 0 as ReturnType<typeof setTimeout> | 0 };

    const announce = () => {
      // Don't interrupt someone already reading their messages.
      if (pathname.startsWith("/messages")) return;
      setToast(true);
      clearTimeout(toastTimer.id);
      toastTimer.id = setTimeout(() => alive && setToast(false), 6000);
      if (document.visibilityState === "hidden" && typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          new Notification("Riya", { body: "Vous avez reçu un nouveau message.", tag: "riya-message" });
        } catch {
          // Some browsers only allow notifications from a service worker; ignore.
        }
      }
    };

    const poll = async () => {
      try {
        const res = await fetch("/api/messages", { cache: "no-store" });
        if (!res.ok || !alive) return;
        const next = (await res.json()).unread as number;
        if (next > previous.current) announce();
        previous.current = next;
        setUnread(next);
      } catch {
        // Ignore a missed poll.
      }
    };

    const timer = setInterval(poll, POLL_MS);
    poll();
    return () => {
      alive = false;
      clearInterval(timer);
      clearTimeout(toastTimer.id);
    };
  }, [pathname]);

  // Never cover the messages area with the toast.
  const showToast = toast && !pathname.startsWith("/messages");

  return (
    <>
      <Link href="/messages" className="btn-ghost relative" aria-label={unread ? `Messages, ${unread} non lus` : "Messages"}>
        <MessageCircle size={20} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay-600 px-1 text-[10px] font-bold text-white">{unread}</span>
        )}
      </Link>
      {showToast && (
        <Link
          href="/messages"
          onClick={() => setToast(false)}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-sand-200 bg-white px-4 py-3 shadow-lg"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-clay-600 text-white"><MessageCircle size={18} /></span>
          <span className="text-sm">
            <span className="block font-semibold text-earth-900">Nouveau message</span>
            <span className="block text-earth-500">Cliquez pour l&apos;ouvrir</span>
          </span>
        </Link>
      )}
    </>
  );
}

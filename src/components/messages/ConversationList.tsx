"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowLeft, BellRing, MessageSquarePlus, Search } from "lucide-react";
import type { Contact, InboxItem } from "@/lib/inbox";
import { Avatar } from "../ui";

const POLL_MS = 4000;
type Tab = "all" | "unread" | "archived";

const noopSubscribe = () => () => {};
const useIsClient = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

// "14:05" today, "Hier", "lun." this week, "03/11/26" before (in the visitor's time zone).
function ShortTime({ iso }: { iso: string }) {
  const client = useIsClient();
  if (!client) return null;
  const date = new Date(iso);
  const now = new Date();
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(now) - day(date)) / 86400000);
  const label =
    days === 0 ? date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : days === 1 ? "Hier"
    : days < 7 ? date.toLocaleDateString("fr-FR", { weekday: "short" })
    : date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  return <time dateTime={iso}>{label}</time>;
}

const ROLE_LABEL: Record<string, string> = { tutor: "Tuteur", student: "Élève", admin: "Équipe Riya", former: "" };

// Left column of the messages page: every contact, the last message and the unread count,
// refreshed every few seconds so new messages appear without reloading.
export function ConversationList({ initial, contacts }: { initial: InboxItem[]; contacts: Contact[] }) {
  const pathname = usePathname();
  const activeId = pathname.startsWith("/messages/") ? pathname.split("/")[2] : null;
  const [items, setItems] = useState(initial);
  const [seenInitial, setSeenInitial] = useState(initial);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [picking, setPicking] = useState(false);

  // Fresh data from the server (after sending a message, archiving…) replaces the polled copy.
  if (initial !== seenInitial) {
    setSeenInitial(initial);
    setItems(initial);
  }

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/messages?liste=1", { cache: "no-store" });
        if (res.ok && alive) setItems(((await res.json()).conversations ?? []) as InboxItem[]);
      } catch {
        // A missed poll is harmless.
      }
    };
    const timer = setInterval(poll, POLL_MS);
    window.addEventListener("focus", poll);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", poll);
    };
  }, []);

  const q = query.trim().toLowerCase();
  const unreadCount = items.filter((c) => c.unread > 0 && !c.archived).length;
  const shown = items.filter(
    (c) =>
      (tab === "archived" ? c.archived : !c.archived && (tab === "all" || c.unread > 0)) &&
      (!q || c.other_name.toLowerCase().includes(q) || c.last_body.toLowerCase().includes(q)),
  );
  const known = new Set(items.map((c) => c.other_id));
  const newContacts = contacts.filter((c) => !q || c.name.toLowerCase().includes(q));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
        {picking ? (
          <button type="button" onClick={() => setPicking(false)} className="flex items-center gap-2 font-display text-xl font-semibold">
            <ArrowLeft size={18} /> Nouvelle discussion
          </button>
        ) : (
          <h1 className="font-display text-2xl font-semibold">Messages</h1>
        )}
        {!picking && contacts.length > 0 && (
          <button type="button" onClick={() => setPicking(true)} className="btn-ghost px-2" title="Nouvelle discussion" aria-label="Nouvelle discussion">
            <MessageSquarePlus size={20} />
          </button>
        )}
      </div>

      <div className="px-4 pb-3">
        <label className="relative block">
          <span className="sr-only">Rechercher</span>
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-earth-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={picking ? "Rechercher un contact" : "Rechercher dans les messages"} className="input rounded-full pl-10" />
        </label>
      </div>

      {!picking && (
        <div className="flex gap-1 border-b border-sand-200 px-3 text-sm font-medium" role="tablist" aria-label="Filtrer les conversations">
          {([["all", "Tous"], ["unread", "Non lus"], ["archived", "Archivés"]] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`relative flex items-center gap-1.5 px-3 py-2.5 transition ${tab === value ? "text-earth-900" : "text-earth-500 hover:text-earth-800"}`}
            >
              {label}
              {value === "unread" && unreadCount > 0 && <span className="rounded-full bg-sand-200 px-1.5 text-[11px] font-bold">{unreadCount}</span>}
              {tab === value && <span className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-clay-600" />}
            </button>
          ))}
        </div>
      )}

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {picking ? (
          newContacts.length ? (
            newContacts.map((c) => (
              <li key={c.id}>
                <Link href={`/messages/${c.id}`} onClick={() => setPicking(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-sand-50">
                  <Avatar name={c.name} src={c.avatar_url} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{c.name}</span>
                    <span className="block text-xs text-earth-500">{ROLE_LABEL[c.role]}{known.has(c.id) ? " · conversation en cours" : ""}</span>
                  </span>
                </Link>
              </li>
            ))
          ) : (
            <li className="p-6 text-center text-sm text-earth-500">Aucun contact ne correspond.</li>
          )
        ) : shown.length ? (
          shown.map((c) => {
            const active = c.other_id === activeId;
            const kind = (c as { last_kind?: string | null }).last_kind;
            return (
              <li key={c.other_id}>
                <Link
                  href={`/messages/${c.other_id}`}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 border-l-4 px-4 py-3 transition ${active ? "border-clay-600 bg-sand-100" : "border-transparent hover:bg-sand-50"}`}
                >
                  <Avatar name={c.other_name} src={c.other_avatar} size={48} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate ${c.unread ? "font-bold text-earth-900" : "font-semibold"}`}>{c.other_name}</span>
                      <span className={`shrink-0 text-xs ${c.unread ? "font-semibold text-clay-700" : "text-earth-500"}`}><ShortTime iso={c.last_at} /></span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className={`flex min-w-0 items-center gap-1 truncate text-sm ${kind ? "text-ochre-800" : c.unread ? "font-semibold text-earth-900" : "text-earth-600"}`}>
                        {kind && <BellRing size={13} className="shrink-0" />}
                        <span className="truncate">{c.last_mine && !kind ? "Vous : " : ""}{c.last_body}</span>
                      </span>
                      {c.unread > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-clay-600 px-1.5 text-[11px] font-bold text-white">{c.unread}</span>
                      )}
                    </span>
                    {ROLE_LABEL[c.other_role] && <span className="mt-0.5 block text-[11px] uppercase tracking-wide text-earth-400">{ROLE_LABEL[c.other_role]}</span>}
                  </span>
                </Link>
              </li>
            );
          })
        ) : (
          <li className="p-6 text-center text-sm text-earth-500">
            {q ? "Aucune conversation ne correspond." : tab === "unread" ? "Aucun message non lu." : tab === "archived" ? "Aucune conversation archivée." : "Aucune conversation pour l'instant."}
            {!q && tab === "all" && contacts.length > 0 && (
              <button type="button" onClick={() => setPicking(true)} className="btn-outline mt-3 w-full">
                <MessageSquarePlus size={16} /> Écrire à un contact
              </button>
            )}
          </li>
        )}
      </ul>
    </div>
  );
}

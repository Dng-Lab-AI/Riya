"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowLeft, BellRing, MessageSquarePlus, Search } from "lucide-react";
import { defineMessages, intlLocale } from "@/i18n";
import { useLocale } from "@/i18n/client";
import type { Contact, InboxItem } from "@/lib/inbox";
import { Avatar } from "../ui";

const POLL_MS = 4000;
type Tab = "all" | "unread" | "archived";

const noopSubscribe = () => () => {};
const useIsClient = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

const M = defineMessages<{
  yesterday: string; roles: Record<string, string>; newChat: string; title: string; search: string; searchContact: string;
  searchMessages: string; filter: string; tabs: Record<Tab, string>; ongoing: string; noContact: string; you: string;
  noMatch: string; noUnread: string; noArchived: string; none: string; writeContact: string;
}>({
  en: {
    yesterday: "Yesterday", roles: { tutor: "Tutor", student: "Student", admin: "Riya team", former: "" }, newChat: "New conversation",
    title: "Messages", search: "Search", searchContact: "Search for a contact", searchMessages: "Search messages", filter: "Filter conversations",
    tabs: { all: "All", unread: "Unread", archived: "Archived" }, ongoing: " · ongoing conversation", noContact: "No contact matches.", you: "You: ",
    noMatch: "No conversation matches.", noUnread: "No unread messages.", noArchived: "No archived conversations.", none: "No conversations yet.",
    writeContact: "Write to a contact",
  },
  fr: {
    yesterday: "Hier", roles: { tutor: "Tuteur", student: "Élève", admin: "Équipe Riya", former: "" }, newChat: "Nouvelle discussion",
    title: "Messages", search: "Rechercher", searchContact: "Rechercher un contact", searchMessages: "Rechercher dans les messages", filter: "Filtrer les conversations",
    tabs: { all: "Tous", unread: "Non lus", archived: "Archivés" }, ongoing: " · conversation en cours", noContact: "Aucun contact ne correspond.", you: "Vous : ",
    noMatch: "Aucune conversation ne correspond.", noUnread: "Aucun message non lu.", noArchived: "Aucune conversation archivée.", none: "Aucune conversation pour l'instant.",
    writeContact: "Écrire à un contact",
  },
});

// "14:05" today, "Yesterday", "Mon" this week, "03/11/26" before (in the visitor's time zone).
function ShortTime({ iso }: { iso: string }) {
  const locale = useLocale();
  const client = useIsClient();
  if (!client) return null;
  const lang = intlLocale(locale);
  const date = new Date(iso);
  const now = new Date();
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(now) - day(date)) / 86400000);
  const label =
    days === 0 ? date.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" })
    : days === 1 ? M[locale].yesterday
    : days < 7 ? date.toLocaleDateString(lang, { weekday: "short" })
    : date.toLocaleDateString(lang, { day: "2-digit", month: "2-digit", year: "2-digit" });
  return <time dateTime={iso}>{label}</time>;
}

// Left column of the messages page: every contact, the last message and the unread count,
// refreshed every few seconds so new messages appear without reloading.
export function ConversationList({ initial, contacts }: { initial: InboxItem[]; contacts: Contact[] }) {
  const t = M[useLocale()];
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
            <ArrowLeft size={18} /> {t.newChat}
          </button>
        ) : (
          <h1 className="font-display text-2xl font-semibold">{t.title}</h1>
        )}
        {!picking && contacts.length > 0 && (
          <button type="button" onClick={() => setPicking(true)} className="btn-ghost px-2" title={t.newChat} aria-label={t.newChat}>
            <MessageSquarePlus size={20} />
          </button>
        )}
      </div>

      <div className="px-4 pb-3">
        <label className="relative block">
          <span className="sr-only">{t.search}</span>
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-earth-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={picking ? t.searchContact : t.searchMessages} className="input rounded-full pl-10" />
        </label>
      </div>

      {!picking && (
        <div className="flex gap-1 border-b border-sand-200 px-3 text-sm font-medium" role="tablist" aria-label={t.filter}>
          {(["all", "unread", "archived"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`relative flex items-center gap-1.5 px-3 py-2.5 transition ${tab === value ? "text-earth-900" : "text-earth-500 hover:text-earth-800"}`}
            >
              {t.tabs[value]}
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
                    <span className="block text-xs text-earth-500">{t.roles[c.role]}{known.has(c.id) ? t.ongoing : ""}</span>
                  </span>
                </Link>
              </li>
            ))
          ) : (
            <li className="p-6 text-center text-sm text-earth-500">{t.noContact}</li>
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
                        <span className="truncate">{c.last_mine && !kind ? t.you : ""}{c.last_body}</span>
                      </span>
                      {c.unread > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-clay-600 px-1.5 text-[11px] font-bold text-white">{c.unread}</span>
                      )}
                    </span>
                    {t.roles[c.other_role] && <span className="mt-0.5 block text-[11px] uppercase tracking-wide text-earth-400">{t.roles[c.other_role]}</span>}
                  </span>
                </Link>
              </li>
            );
          })
        ) : (
          <li className="p-6 text-center text-sm text-earth-500">
            {q ? t.noMatch : tab === "unread" ? t.noUnread : tab === "archived" ? t.noArchived : t.none}
            {!q && tab === "all" && contacts.length > 0 && (
              <button type="button" onClick={() => setPicking(true)} className="btn-outline mt-3 w-full">
                <MessageSquarePlus size={16} /> {t.writeContact}
              </button>
            )}
          </li>
        )}
      </ul>
    </div>
  );
}

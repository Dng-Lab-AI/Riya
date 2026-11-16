"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, LayoutDashboard, LogOut, MessageCircle, UserCheck, Users } from "lucide-react";
import { defineMessages } from "@/i18n";
import { useLocale } from "@/i18n/client";
import { adminLogout } from "@/lib/actions/admin";
import { LanguageSwitcher } from "../LanguageSwitcher";

const M = defineMessages({
  en: { dashboard: "Dashboard", members: "Members", review: "Tutors to approve", messages: "Messages", site: "Public site", logout: "Log out", team: "Riya team" },
  fr: { dashboard: "Tableau de bord", members: "Membres", review: "Tuteurs à valider", messages: "Messages", site: "Site public", logout: "Se déconnecter", team: "Équipe Riya" },
});

// Sidebar of the admin site (a row of pills on phones).
export function AdminNav({ name, toReview, unread, publicUrl }: { name: string; toReview: number; unread: number; publicUrl: string }) {
  const t = M[useLocale()];
  const pathname = usePathname();
  const items = [
    { href: "/", label: t.dashboard, icon: LayoutDashboard, badge: 0, active: pathname === "/" },
    { href: "/utilisateurs", label: t.members, icon: Users, badge: 0, active: pathname.startsWith("/utilisateurs") },
    { href: "/#a-valider", label: t.review, icon: UserCheck, badge: toReview, active: false },
    { href: "/messages", label: t.messages, icon: MessageCircle, badge: unread, active: pathname.startsWith("/messages") },
  ];

  return (
    <nav className="flex flex-col gap-6 lg:h-full">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="font-display text-2xl font-semibold text-sand-50">riya <span className="text-sm font-normal text-ochre-300">admin</span></Link>
        <div className="lg:hidden"><LanguageSwitcher dark /></div>
      </div>
      <ul className="-mx-1 flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {items.map((item) => (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${item.active ? "bg-sand-50 text-forest-900" : "text-sand-200 hover:bg-white/10"}`}
            >
              <item.icon size={18} /> <span className="whitespace-nowrap">{item.label}</span>
              {item.badge > 0 && <span className="ml-auto rounded-full bg-clay-600 px-1.5 text-[11px] font-bold text-white">{item.badge}</span>}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-auto hidden space-y-3 border-t border-white/10 pt-4 lg:block">
        <p className="text-sm text-sand-200">{name}<span className="block text-xs text-sand-300">{t.team}</span></p>
        <LanguageSwitcher dark />
        <a href={publicUrl} className="flex items-center gap-2 text-sm text-sand-200 hover:text-white"><ExternalLink size={15} /> {t.site}</a>
        <form action={adminLogout}>
          <button className="flex items-center gap-2 text-sm text-sand-200 hover:text-white"><LogOut size={15} /> {t.logout}</button>
        </form>
      </div>
    </nav>
  );
}

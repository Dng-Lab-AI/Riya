"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ExternalLink, GraduationCap, LogOut, MessageCircle, Settings, ShieldCheck, UserRound, Wallet } from "lucide-react";
import { logout } from "@/lib/actions/auth";

type Item = { href: string; label: string; icon: typeof CalendarDays; badge?: number };

// Account sidebar: one link per zone, the current one highlighted.
export function EspaceNav({ role, userId, unread }: { role: string; userId: string; unread: number }) {
  const pathname = usePathname();
  const sections: { title: string; items: Item[] }[] = [
    {
      title: role === "tutor" ? "Mon enseignement" : "Mon apprentissage",
      items: [
        { href: "/tableau-de-bord", label: "Mes cours", icon: CalendarDays },
        { href: "/messages", label: "Messages", icon: MessageCircle, badge: unread },
      ],
    },
    {
      title: "Mon profil",
      items: [
        { href: "/profil", label: "Informations personnelles", icon: UserRound },
        ...(role === "tutor" ? [{ href: "/profil/tuteur", label: "Profil de tuteur", icon: GraduationCap }] : []),
        { href: "/profil/paiements", label: role === "tutor" ? "Revenus" : "Paiements", icon: Wallet },
        { href: "/profil/securite", label: "Sécurité", icon: ShieldCheck },
      ],
    },
    ...(role === "admin" ? [{ title: "Équipe", items: [{ href: "/admin", label: "Administration", icon: Settings }] }] : []),
  ];
  // "/profil" must not stay highlighted on its sub-pages, and "/messages" covers each thread.
  const isActive = (href: string) => pathname === href || (href !== "/profil" && pathname.startsWith(`${href}/`));

  return (
    <nav aria-label="Mon espace">
      {/* Phones: one scrollable row of pills. */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
        {sections.flatMap((s) => s.items).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive(item.href) ? "bg-forest-800 text-sand-50" : "border border-earth-900/10 bg-white text-earth-700"
            }`}
          >
            <item.icon size={16} /> {item.label}
            {!!item.badge && <span className="rounded-full bg-clay-600 px-1.5 text-[11px] font-bold text-white">{item.badge}</span>}
          </Link>
        ))}
      </div>

      <div className="hidden space-y-6 lg:block">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-earth-400">{section.title}</p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                        active ? "bg-forest-800 text-sand-50 shadow-sm" : "text-earth-700 hover:bg-white hover:text-earth-900"
                      }`}
                    >
                      <span className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${active ? "bg-white/10 text-ochre-300" : "bg-white text-earth-500 group-hover:text-clay-600"}`}>
                        <item.icon size={17} />
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {!!item.badge && <span className="rounded-full bg-clay-600 px-2 py-0.5 text-[11px] font-bold text-white">{item.badge}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div className="space-y-1 border-t border-sand-200 pt-4">
          {role === "tutor" && (
            <Link href={`/tuteurs/${userId}`} className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-earth-600 hover:bg-white hover:text-earth-900">
              <ExternalLink size={16} /> Voir mon profil public
            </Link>
          )}
          <form action={logout}>
            <button className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm text-clay-700 hover:bg-clay-50">
              <LogOut size={16} /> Se déconnecter
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}

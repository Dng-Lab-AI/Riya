"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CalendarRange, ExternalLink, GraduationCap, Heart, House, LogOut, MessageCircle, MonitorPlay, Settings, ShieldCheck, TrendingUp, UserRound, UsersRound, Wallet } from "lucide-react";
import { defineMessages } from "@/i18n";
import { useLocale } from "@/i18n/client";
import { logout } from "@/lib/actions/auth";

const M = defineMessages({
  en: {
    teaching: "My teaching", learning: "My learning", home: "Home", messages: "Messages", calendar: "Calendar", lessons: "My lessons", students: "My students",
    demo: "Demo classroom", progressTutor: "Insights", tutors: "My tutors", progressStudent: "My progress", profile: "My profile",
    personal: "Personal information", tutorProfile: "Tutor profile", earnings: "Earnings", payments: "Payments", security: "Security", team: "Team",
    admin: "Admin", space: "My space", publicProfile: "View my public profile", logout: "Log out",
  },
  fr: {
    teaching: "Mon enseignement", learning: "Mon apprentissage", home: "Accueil", messages: "Messages", calendar: "Calendrier", lessons: "Mes cours", students: "Mes élèves",
    demo: "Salle de démo", progressTutor: "Statistiques", tutors: "Mes tuteurs", progressStudent: "Ma progression", profile: "Mon profil",
    personal: "Informations personnelles", tutorProfile: "Profil de tuteur", earnings: "Revenus", payments: "Paiements", security: "Sécurité", team: "Équipe",
    admin: "Administration", space: "Mon espace", publicProfile: "Voir mon profil public", logout: "Se déconnecter",
  },
});

type Item = { href: string; label: string; icon: typeof CalendarDays; badge?: number };

// Account sidebar: one link per zone, the current one highlighted.
export function EspaceNav({ role, userId, unread }: { role: string; userId: string; unread: number }) {
  const pathname = usePathname();
  const t = M[useLocale()];
  const sections: { title: string; items: Item[] }[] = [
    {
      title: role === "tutor" ? t.teaching : t.learning,
      // Tutors: the same order as their daily routine (home, messages, calendar, students, classroom, insights).
      // Students: their lessons first, then their tutors and messages.
      items:
        role === "tutor"
          ? [
              { href: "/accueil", label: t.home, icon: House },
              { href: "/messages", label: t.messages, icon: MessageCircle, badge: unread },
              { href: "/calendrier", label: t.calendar, icon: CalendarRange },
              { href: "/tableau-de-bord", label: t.lessons, icon: CalendarDays },
              { href: "/eleves", label: t.students, icon: UsersRound },
              { href: "/salle-de-demo", label: t.demo, icon: MonitorPlay },
              { href: "/statistiques", label: t.progressTutor, icon: TrendingUp },
            ]
          : [
              { href: "/tableau-de-bord", label: t.lessons, icon: CalendarDays },
              { href: "/mes-tuteurs", label: t.tutors, icon: Heart },
              { href: "/messages", label: t.messages, icon: MessageCircle, badge: unread },
              { href: "/progression", label: t.progressStudent, icon: TrendingUp },
            ],
    },
    // Tutors can also learn with another tutor.
    ...(role === "tutor" ? [{ title: t.learning, items: [
          { href: "/mes-tuteurs", label: t.tutors, icon: Heart },
          { href: "/progression", label: t.progressStudent, icon: TrendingUp },
        ] }] : []),
    {
      title: t.profile,
      items: [
        { href: "/profil", label: t.personal, icon: UserRound },
        ...(role === "tutor" ? [{ href: "/profil/tuteur", label: t.tutorProfile, icon: GraduationCap }] : []),
        { href: "/profil/paiements", label: role === "tutor" ? t.earnings : t.payments, icon: Wallet },
        { href: "/profil/securite", label: t.security, icon: ShieldCheck },
      ],
    },
    ...(role === "admin" ? [{ title: t.team, items: [{ href: "/admin", label: t.admin, icon: Settings }] }] : []),
  ];
  // "/profil" must not stay highlighted on its sub-pages, and "/messages" covers each thread.
  const isActive = (href: string) => pathname === href || (href !== "/profil" && pathname.startsWith(`${href}/`));

  return (
    <nav aria-label={t.space}>
      {/* Phones: one scrollable row of pills. */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:hidden">
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
              <ExternalLink size={16} /> {t.publicProfile}
            </Link>
          )}
          <form action={logout}>
            <button className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm text-clay-700 hover:bg-clay-50">
              <LogOut size={16} /> {t.logout}
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}

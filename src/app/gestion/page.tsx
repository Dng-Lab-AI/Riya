import Link from "next/link";
import { Activity, BookOpen, GraduationCap, ShieldAlert, UserPlus, Users, Wallet } from "lucide-react";
import { TutorReviews } from "@/components/admin/TutorReviews";
import { Avatar } from "@/components/ui";
import { defineMessages } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { getAdminStats, getRecentActivity } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { formatPrice, timeAgo } from "@/lib/constants";
import { ACTION_LABELS, ROLE_LABELS } from "./labels";

const M = defineMessages({
  en: {
    hello: (name: string) => `Hello ${name}`, lead: "Everything happening on Riya, and what needs your attention.",
    members: "Members", membersHint: (s: number, t: number) => `${s} students · ${t} tutors`, tutors: "Tutors in the search",
    tutorsHint: (n: number) => `${n} waiting for approval`, newMembers: "New this week", activeMembers: (n: number) => `${n} active this week`,
    lessons: "Lessons booked", lessonsHint: "confirmed or completed", volume: "Lesson volume", volumeHint: "completed lessons",
    moderation: "Moderation", moderationHint: (s: number, b: number) => `${s} suspended · ${b} blocked`,
    signups: "Latest sign-ups", allMembers: "All members", actions: "Latest team actions", noActions: "No actions yet.",
  },
  fr: {
    hello: (name: string) => `Bonjour ${name}`, lead: "Tout ce qui se passe sur Riya, et ce qui demande votre attention.",
    members: "Membres", membersHint: (s: number, t: number) => `${s} élèves · ${t} tuteurs`, tutors: "Tuteurs dans la recherche",
    tutorsHint: (n: number) => `${n} en attente de validation`, newMembers: "Nouveaux cette semaine", activeMembers: (n: number) => `${n} actifs cette semaine`,
    lessons: "Cours réservés", lessonsHint: "confirmés ou terminés", volume: "Volume des cours", volumeHint: "cours terminés",
    moderation: "Modération", moderationHint: (s: number, b: number) => `${s} suspendus · ${b} bloqués`,
    signups: "Dernières inscriptions", allMembers: "Tous les membres", actions: "Dernières actions de l'équipe", noActions: "Aucune action pour l'instant.",
  },
});

export const generateMetadata = () => titled({ en: "Admin dashboard", fr: "Tableau de bord admin" });

export default async function AdminDashboard() {
  const admin = await requireAdmin();
  const locale = await getLocale();
  const t = M[locale];
  const [stats, recent] = await Promise.all([getAdminStats(), getRecentActivity()]);

  const cards = [
    { icon: Users, label: t.members, value: stats.members, hint: t.membersHint(stats.students, stats.tutors), href: "/utilisateurs" },
    { icon: GraduationCap, label: t.tutors, value: stats.approvedTutors, hint: t.tutorsHint(stats.toReview), href: "/#a-valider" },
    { icon: UserPlus, label: t.newMembers, value: stats.newThisWeek, hint: t.activeMembers(stats.activeThisWeek), href: "/utilisateurs?tri=activite" },
    { icon: BookOpen, label: t.lessons, value: stats.lessons, hint: t.lessonsHint, href: null },
    { icon: Wallet, label: t.volume, value: formatPrice(stats.volume, locale), hint: t.volumeHint, href: null },
    { icon: ShieldAlert, label: t.moderation, value: stats.suspended + stats.blocked, hint: t.moderationHint(stats.suspended, stats.blocked), href: "/utilisateurs?statut=suspended" },
  ];

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-3xl font-semibold">{t.hello(admin.name.split(" ")[0])}</h1>
        <p className="mt-1 text-earth-600">{t.lead}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => {
          const body = (
            <>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-clay-50 text-clay-600"><c.icon size={24} /></span>
              <div>
                <p className="text-sm text-earth-500">{c.label}</p>
                <p className="font-display text-2xl font-semibold">{c.value}</p>
                <p className="text-xs text-earth-500">{c.hint}</p>
              </div>
            </>
          );
          return c.href ? (
            <Link key={c.label} href={c.href} className="card flex items-center gap-4 p-5 transition hover:border-clay-300">{body}</Link>
          ) : (
            <div key={c.label} className="card flex items-center gap-4 p-5">{body}</div>
          );
        })}
      </div>

      <TutorReviews locale={locale} />

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">{t.signups}</h2>
            <Link href="/utilisateurs" className="text-sm font-semibold underline underline-offset-4">{t.allMembers}</Link>
          </div>
          <ul className="divide-y divide-sand-200">
            {recent.signups.map((u) => (
              <li key={u.id}>
                <Link href={`/utilisateurs/${u.id}`} className="flex items-center gap-3 py-3 hover:text-clay-700">
                  <Avatar name={u.name} src={u.avatar_url} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{u.name}</span>
                    <span className="block truncate text-xs text-earth-500">{u.email}</span>
                  </span>
                  <span className="text-right text-xs text-earth-500">{ROLE_LABELS[locale][u.role]}<br />{timeAgo(u.joined_at, locale)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold"><Activity size={20} /> {t.actions}</h2>
          {recent.logs.length ? (
            <ul className="divide-y divide-sand-200">
              {recent.logs.map((g) => (
                <li key={g.id} className="py-3 text-sm">
                  <p>
                    <span className="font-semibold">{ACTION_LABELS[locale][g.action]}</span> ·{" "}
                    <Link href={`/utilisateurs/${g.user_id}`} className="hover:text-clay-700">{g.user_name}</Link>
                  </p>
                  {g.note && <p className="truncate text-earth-600">{g.note}</p>}
                  <p className="text-xs text-earth-500">{g.admin_name} · {timeAgo(g.at, locale)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-earth-600">{t.noActions}</p>
          )}
        </section>
      </div>
    </div>
  );
}

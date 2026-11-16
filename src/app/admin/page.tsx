import Link from "next/link";
import { BookOpen, GraduationCap, Languages, MessagesSquare, UserCheck, Users, Wallet } from "lucide-react";
import { SubmitButton } from "@/components/client";
import { Avatar, EmptyState, PageHeader } from "@/components/ui";
import { defineMessages } from "@/i18n";
import { countryName } from "@/i18n/catalog";
import { getLocale, titled } from "@/i18n/server";
import { setTutorApproval, setUserRole, setUserStatus } from "@/lib/actions/admin";
import { requireRole } from "@/lib/auth";
import { first, formatPrice, timeAgo } from "@/lib/constants";
import { getPlatformStats, listPendingTutors, listTopics, listUsers } from "@/lib/queries";

const ROLE_STYLE: Record<string, string> = {
  student: "bg-sand-100 text-earth-700",
  tutor: "bg-forest-100 text-forest-800",
  admin: "bg-ochre-100 text-ochre-800",
};

const M = defineMessages<{
  roles: Record<string, string>; members: string; students: (n: number) => string; activeTutors: string; pending: (n: number) => string;
  booked: string; bookedHint: string; volume: string; volumeHint: string; discussions: string; discussionsHint: string; languages: string;
  languagesHint: string; eyebrow: string; title: string; toApprove: string; noLanguage: string; noCountry: string; incomplete: string;
  approve: string; noPending: string; search: string; searchPlaceholder: string; member: string; role: string; status: string;
  joined: string; actions: string; active: string; suspended: string; you: string; toStudent: string; toTutor: string; suspend: string;
  reactivate: string; latest: string; by: string; replies: (n: number) => string; moderate: string;
}>({
  en: {
    roles: { student: "Student", tutor: "Tutor", admin: "Admin" }, members: "Members", students: (n) => `${n} students`,
    activeTutors: "Active tutors", pending: (n) => `${n} pending`, booked: "Lessons booked", bookedHint: "confirmed or completed",
    volume: "Lesson volume", volumeHint: "completed lessons", discussions: "Discussions", discussionsHint: "on the forum",
    languages: "Languages", languagesHint: "in the catalogue", eyebrow: "Administration", title: "Platform dashboard",
    toApprove: "Tutors to approve", noLanguage: "No language given", noCountry: "Country not given", incomplete: "Incomplete profile",
    approve: "Approve", noPending: "No profiles waiting", search: "Search", searchPlaceholder: "Name or email", member: "Member",
    role: "Role", status: "Status", joined: "Joined", actions: "Actions", active: "Active", suspended: "Suspended", you: "You",
    toStudent: "→ Student", toTutor: "→ Tutor", suspend: "Suspend", reactivate: "Reactivate", latest: "Latest discussions",
    by: "by", replies: (n) => `${n} repl${n === 1 ? "y" : "ies"}`, moderate: "Moderate",
  },
  fr: {
    roles: { student: "Élève", tutor: "Tuteur", admin: "Admin" }, members: "Membres", students: (n) => `${n} élèves`,
    activeTutors: "Tuteurs actifs", pending: (n) => `${n} en attente`, booked: "Cours réservés", bookedHint: "confirmés ou terminés",
    volume: "Volume des cours", volumeHint: "cours terminés", discussions: "Discussions", discussionsHint: "sur le forum",
    languages: "Langues", languagesHint: "au catalogue", eyebrow: "Administration", title: "Tableau de bord de la plateforme",
    toApprove: "Tuteurs à valider", noLanguage: "Aucune langue renseignée", noCountry: "Pays non renseigné", incomplete: "Profil incomplet",
    approve: "Valider", noPending: "Aucun profil en attente", search: "Rechercher", searchPlaceholder: "Nom ou e-mail", member: "Membre",
    role: "Rôle", status: "Statut", joined: "Inscrit", actions: "Actions", active: "Actif", suspended: "Suspendu", you: "Vous",
    toStudent: "→ Élève", toTutor: "→ Tuteur", suspend: "Suspendre", reactivate: "Réactiver", latest: "Dernières discussions",
    by: "par", replies: (n) => `${n} réponse(s)`, moderate: "Modérer",
  },
});

export const generateMetadata = () => titled({ en: "Administration", fr: "Administration" });

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const admin = await requireRole("admin", "/admin");
  const q = first((await searchParams).q);
  const [stats, pending, users, topics, locale] = await Promise.all([getPlatformStats(), listPendingTutors(), listUsers(q), listTopics({}, 6), getLocale()]);
  const t = M[locale];

  const cards = [
    { icon: Users, label: t.members, value: stats.users, hint: t.students(stats.students) },
    { icon: GraduationCap, label: t.activeTutors, value: stats.tutors, hint: t.pending(stats.pendingTutors) },
    { icon: BookOpen, label: t.booked, value: stats.lessons, hint: t.bookedHint },
    { icon: Wallet, label: t.volume, value: formatPrice(stats.revenue, locale), hint: t.volumeHint },
    { icon: MessagesSquare, label: t.discussions, value: stats.topics, hint: t.discussionsHint },
    { icon: Languages, label: t.languages, value: stats.languages, hint: t.languagesHint },
  ];

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} />
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <div key={c.label} className="card flex items-center gap-4 p-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-clay-50 text-clay-600"><c.icon size={24} /></span>
              <div>
                <p className="text-sm text-earth-500">{c.label}</p>
                <p className="font-display text-2xl font-semibold">{c.value}</p>
                <p className="text-xs text-earth-500">{c.hint}</p>
              </div>
            </div>
          ))}
        </div>

        <section>
          <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-semibold"><UserCheck size={22} /> {t.toApprove}</h2>
          {pending.length ? (
            <div className="space-y-3">
              {pending.map((tutor) => (
                <div key={tutor.id} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  <Avatar name={tutor.name} src={tutor.avatar_url} size={48} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/tuteurs/${tutor.id}`} className="font-semibold hover:text-clay-700">{tutor.name}</Link>
                    <p className="text-sm text-earth-600">{tutor.languages.map((l) => l.name).join(", ") || t.noLanguage} · {tutor.country ? countryName(tutor.country, locale) : t.noCountry} · {formatPrice(tutor.hourly_rate, locale)}</p>
                    <p className="truncate text-sm text-earth-500">{tutor.headline || t.incomplete}</p>
                  </div>
                  <form action={setTutorApproval.bind(null, tutor.id, true)}>
                    <SubmitButton disabled={!tutor.headline || tutor.languages.length === 0} title={!tutor.headline ? t.incomplete : undefined}>{t.approve}</SubmitButton>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title={t.noPending} />
          )}
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold">{t.members}</h2>
            <form className="flex gap-2">
              <input name="q" defaultValue={q} placeholder={t.searchPlaceholder} className="input w-64" />
              <button className="btn-outline">{t.search}</button>
            </form>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-sand-100 text-xs uppercase tracking-wider text-earth-600">
                <tr>
                  <th className="p-4 font-semibold">{t.member}</th>
                  <th className="p-4 font-semibold">{t.role}</th>
                  <th className="p-4 font-semibold">{t.status}</th>
                  <th className="p-4 font-semibold">{t.joined}</th>
                  <th className="p-4 text-right font-semibold">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-sand-50">
                    <td className="p-4">
                      <p className="font-semibold">{u.name}</p>
                      <p className="text-earth-500">{u.email}</p>
                    </td>
                    <td className="p-4"><span className={`chip ${ROLE_STYLE[u.role]}`}>{t.roles[u.role]}</span></td>
                    <td className="p-4">
                      <span className={`chip ${u.status === "active" ? "bg-forest-100 text-forest-800" : "bg-clay-100 text-clay-800"}`}>
                        {u.status === "active" ? t.active : t.suspended}
                      </span>
                    </td>
                    <td className="p-4 text-earth-500">{timeAgo(u.created_at, locale)}</td>
                    <td className="p-4">
                      {u.id === admin.id ? (
                        <p className="text-right text-xs text-earth-500">{t.you}</p>
                      ) : (
                        <div className="flex justify-end gap-2">
                          {u.role !== "admin" && (
                            <form action={setUserRole.bind(null, u.id, u.role === "tutor" ? "student" : "tutor")}>
                              <SubmitButton className="btn-ghost text-xs">{u.role === "tutor" ? t.toStudent : t.toTutor}</SubmitButton>
                            </form>
                          )}
                          <form action={setUserStatus.bind(null, u.id, u.status === "active" ? "suspended" : "active")}>
                            <SubmitButton className={`btn-ghost text-xs ${u.status === "active" ? "text-clay-700" : "text-forest-700"}`}>
                              {u.status === "active" ? t.suspend : t.reactivate}
                            </SubmitButton>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold">{t.latest}</h2>
          <ul className="card divide-y divide-sand-200">
            {topics.map((topic) => (
              <li key={topic.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <Link href={`/forum/${topic.id}`} className="font-semibold hover:text-clay-700">{topic.title}</Link>
                  <p className="text-xs text-earth-500">{t.by} {topic.author_name} · {timeAgo(topic.created_at, locale)} · {t.replies(topic.reply_count)}</p>
                </div>
                <Link href={`/forum/${topic.id}`} className="btn-ghost text-xs">{t.moderate}</Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

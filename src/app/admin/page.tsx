import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, GraduationCap, Languages, MessagesSquare, UserCheck, Users, Wallet } from "lucide-react";
import { SubmitButton } from "@/components/client";
import { Avatar, EmptyState, PageHeader } from "@/components/ui";
import { setTutorApproval, setUserRole, setUserStatus } from "@/lib/actions/admin";
import { requireRole } from "@/lib/auth";
import { first, formatPrice, timeAgo } from "@/lib/constants";
import { getPlatformStats, listPendingTutors, listTopics, listUsers } from "@/lib/queries";

export const metadata: Metadata = { title: "Administration" };

const ROLE_LABEL: Record<string, string> = { student: "Élève", tutor: "Tuteur", admin: "Admin" };
const ROLE_STYLE: Record<string, string> = {
  student: "bg-sand-100 text-earth-700",
  tutor: "bg-forest-100 text-forest-800",
  admin: "bg-ochre-100 text-ochre-800",
};

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const admin = await requireRole("admin", "/admin");
  const q = first((await searchParams).q);
  const [stats, pending, users, topics] = await Promise.all([getPlatformStats(), listPendingTutors(), listUsers(q), listTopics({}, 6)]);

  const cards = [
    { icon: Users, label: "Membres", value: stats.users, hint: `${stats.students} élèves` },
    { icon: GraduationCap, label: "Tuteurs actifs", value: stats.tutors, hint: `${stats.pendingTutors} en attente` },
    { icon: BookOpen, label: "Cours réservés", value: stats.lessons, hint: "confirmés ou terminés" },
    { icon: Wallet, label: "Volume des cours", value: formatPrice(stats.revenue), hint: "cours terminés" },
    { icon: MessagesSquare, label: "Discussions", value: stats.topics, hint: "sur le forum" },
    { icon: Languages, label: "Langues", value: stats.languages, hint: "au catalogue" },
  ];

  return (
    <>
      <PageHeader eyebrow="Administration" title="Tableau de bord de la plateforme" />
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
          <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-semibold"><UserCheck size={22} /> Tuteurs à valider</h2>
          {pending.length ? (
            <div className="space-y-3">
              {pending.map((t) => (
                <div key={t.id} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  <Avatar name={t.name} src={t.avatar_url} size={48} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/tuteurs/${t.id}`} className="font-semibold hover:text-clay-700">{t.name}</Link>
                    <p className="text-sm text-earth-600">{t.languages.map((l) => l.name).join(", ") || "Aucune langue renseignée"} · {t.country || "Pays non renseigné"} · {formatPrice(t.hourly_rate)}</p>
                    <p className="truncate text-sm text-earth-500">{t.headline || "Profil incomplet"}</p>
                  </div>
                  <form action={setTutorApproval.bind(null, t.id, true)}>
                    <SubmitButton disabled={!t.headline || t.languages.length === 0} title={!t.headline ? "Profil incomplet" : undefined}>Valider</SubmitButton>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Aucun profil en attente" />
          )}
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold">Membres</h2>
            <form className="flex gap-2">
              <input name="q" defaultValue={q} placeholder="Nom ou e-mail" className="input w-64" />
              <button className="btn-outline">Rechercher</button>
            </form>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-sand-100 text-xs uppercase tracking-wider text-earth-600">
                <tr>
                  <th className="p-4 font-semibold">Membre</th>
                  <th className="p-4 font-semibold">Rôle</th>
                  <th className="p-4 font-semibold">Statut</th>
                  <th className="p-4 font-semibold">Inscrit</th>
                  <th className="p-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-sand-50">
                    <td className="p-4">
                      <p className="font-semibold">{u.name}</p>
                      <p className="text-earth-500">{u.email}</p>
                    </td>
                    <td className="p-4"><span className={`chip ${ROLE_STYLE[u.role]}`}>{ROLE_LABEL[u.role]}</span></td>
                    <td className="p-4">
                      <span className={`chip ${u.status === "active" ? "bg-forest-100 text-forest-800" : "bg-clay-100 text-clay-800"}`}>
                        {u.status === "active" ? "Actif" : "Suspendu"}
                      </span>
                    </td>
                    <td className="p-4 text-earth-500">{timeAgo(u.created_at)}</td>
                    <td className="p-4">
                      {u.id === admin.id ? (
                        <p className="text-right text-xs text-earth-500">Vous</p>
                      ) : (
                        <div className="flex justify-end gap-2">
                          {u.role !== "admin" && (
                            <form action={setUserRole.bind(null, u.id, u.role === "tutor" ? "student" : "tutor")}>
                              <SubmitButton className="btn-ghost text-xs">{u.role === "tutor" ? "→ Élève" : "→ Tuteur"}</SubmitButton>
                            </form>
                          )}
                          <form action={setUserStatus.bind(null, u.id, u.status === "active" ? "suspended" : "active")}>
                            <SubmitButton className={`btn-ghost text-xs ${u.status === "active" ? "text-clay-700" : "text-forest-700"}`}>
                              {u.status === "active" ? "Suspendre" : "Réactiver"}
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
          <h2 className="mb-4 font-display text-2xl font-semibold">Dernières discussions</h2>
          <ul className="card divide-y divide-sand-200">
            {topics.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <Link href={`/forum/${t.id}`} className="font-semibold hover:text-clay-700">{t.title}</Link>
                  <p className="text-xs text-earth-500">par {t.author_name} · {timeAgo(t.created_at)} · {t.reply_count} réponse(s)</p>
                </div>
                <Link href={`/forum/${t.id}`} className="btn-ghost text-xs">Modérer</Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

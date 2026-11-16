import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Avatar, EmptyState } from "@/components/ui";
import { defineMessages } from "@/i18n";
import { countryName } from "@/i18n/catalog";
import { getLocale, titled } from "@/i18n/server";
import { listMembers, MEMBERS_PER_PAGE } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { first, timeAgo } from "@/lib/constants";
import { ROLE_LABELS, ROLE_STYLE, STATUS_LABELS, STATUS_STYLE } from "../labels";

const M = defineMessages({
  en: {
    title: "Members", lead: (n: number) => `${n} member${n === 1 ? "" : "s"} found.`, search: "Search", placeholder: "Name or e-mail",
    allRoles: "All roles", allStatuses: "All statuses", pending: "Tutors to approve", newest: "Newest first", activity: "Last active", byName: "Name",
    member: "Member", role: "Role", status: "Status", lessons: "Lessons", joined: "Joined", lastSeen: "Last seen", never: "—",
    notApproved: "not approved", none: "No members match these filters.", deleted: "The account has been deleted.",
    previous: "Previous", next: "Next", page: (p: number, n: number) => `Page ${p} of ${n}`,
  },
  fr: {
    title: "Membres", lead: (n: number) => `${n} membre${n > 1 ? "s" : ""} trouvé${n > 1 ? "s" : ""}.`, search: "Rechercher", placeholder: "Nom ou e-mail",
    allRoles: "Tous les rôles", allStatuses: "Tous les statuts", pending: "Tuteurs à valider", newest: "Plus récents", activity: "Dernière activité", byName: "Nom",
    member: "Membre", role: "Rôle", status: "Statut", lessons: "Cours", joined: "Inscrit", lastSeen: "Vu", never: "—",
    notApproved: "non validé", none: "Aucun membre ne correspond à ces filtres.", deleted: "Le compte a été supprimé.",
    previous: "Précédent", next: "Suivant", page: (p: number, n: number) => `Page ${p} sur ${n}`,
  },
});

export const generateMetadata = () => titled({ en: "Members", fr: "Membres" });

export default async function MembersPage({ searchParams }: PageProps<"/gestion/utilisateurs">) {
  await requireAdmin();
  const sp = await searchParams;
  const locale = await getLocale();
  const t = M[locale];
  const filters = { q: first(sp.q), role: first(sp.role), status: first(sp.statut), sort: first(sp.tri), page: Number(first(sp.page)) || 1 };
  const { rows, total } = await listMembers(filters);
  const pages = Math.max(1, Math.ceil(total / MEMBERS_PER_PAGE));
  const pageHref = (page: number) => {
    const params = new URLSearchParams(Object.entries({ q: filters.q, role: filters.role, statut: filters.status, tri: filters.sort }).filter(([, v]) => v) as [string, string][]);
    params.set("page", String(page));
    return `/utilisateurs?${params}`;
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">{t.title}</h1>
        <p className="mt-1 text-earth-600">{t.lead(total)}</p>
      </header>
      {first(sp.supprime) === "1" && <p className="rounded-2xl bg-forest-100 p-4 font-medium text-forest-800">{t.deleted}</p>}

      <form className="card flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-48 flex-1">
          <span className="sr-only">{t.search}</span>
          <input name="q" defaultValue={filters.q} placeholder={t.placeholder} className="input" />
        </label>
        <select name="role" defaultValue={filters.role ?? ""} className="input w-auto" aria-label={t.role}>
          <option value="">{t.allRoles}</option>
          {(["student", "tutor", "admin"] as const).map((r) => <option key={r} value={r}>{ROLE_LABELS[locale][r]}</option>)}
        </select>
        <select name="statut" defaultValue={filters.status ?? ""} className="input w-auto" aria-label={t.status}>
          <option value="">{t.allStatuses}</option>
          {(["active", "suspended", "blocked"] as const).map((s) => <option key={s} value={s}>{STATUS_LABELS[locale][s]}</option>)}
          <option value="pending">{t.pending}</option>
        </select>
        <select name="tri" defaultValue={filters.sort ?? ""} className="input w-auto" aria-label="Sort">
          <option value="">{t.newest}</option>
          <option value="activite">{t.activity}</option>
          <option value="nom">{t.byName}</option>
        </select>
        <button className="btn-dark"><Search size={16} /> {t.search}</button>
      </form>

      {rows.length ? (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="bg-sand-100 text-xs uppercase tracking-wider text-earth-600">
              <tr>
                <th className="p-4 font-semibold">{t.member}</th>
                <th className="p-4 font-semibold">{t.role}</th>
                <th className="p-4 font-semibold">{t.status}</th>
                <th className="p-4 text-right font-semibold">{t.lessons}</th>
                <th className="p-4 font-semibold">{t.joined}</th>
                <th className="p-4 font-semibold">{t.lastSeen}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {rows.map((u) => (
                <tr key={u.id} className="hover:bg-sand-50">
                  <td className="p-4">
                    <Link href={`/utilisateurs/${u.id}`} className="flex items-center gap-3 hover:text-clay-700">
                      <Avatar name={u.name} src={u.avatar_url} size={36} />
                      <span className="min-w-0">
                        <span className="block font-semibold">{u.name}</span>
                        <span className="block truncate text-earth-500">{u.email}{u.country && ` · ${countryName(u.country, locale)}`}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="p-4">
                    <span className={`chip ${ROLE_STYLE[u.role]}`}>{ROLE_LABELS[locale][u.role]}</span>
                    {u.approved === false && <span className="mt-1 block text-xs text-ochre-800">{t.notApproved}</span>}
                  </td>
                  <td className="p-4"><span className={`chip ${STATUS_STYLE[u.status]}`}>{STATUS_LABELS[locale][u.status]}</span></td>
                  <td className="p-4 text-right tabular-nums">{u.lessons}</td>
                  <td className="p-4 text-earth-500">{timeAgo(u.joined_at, locale)}</td>
                  <td className="p-4 text-earth-500">{u.last_seen_at ? timeAgo(u.last_seen_at, locale) : t.never}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title={t.none} />
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-between gap-3 text-sm">
          {filters.page > 1 ? <Link href={pageHref(filters.page - 1)} className="btn-outline"><ChevronLeft size={16} /> {t.previous}</Link> : <span />}
          <span className="text-earth-600">{t.page(filters.page, pages)}</span>
          {filters.page < pages ? <Link href={pageHref(filters.page + 1)} className="btn-outline">{t.next} <ChevronRight size={16} /></Link> : <span />}
        </nav>
      )}
    </div>
  );
}

import Link from "next/link";
import { Flag } from "lucide-react";
import { ResolveReportForm } from "@/components/admin/OpsForms";
import { EmptyState } from "@/components/ui";
import { defineMessages } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { listReports, type ReportView } from "@/lib/admin-ops";
import { requireAdmin } from "@/lib/auth";
import { timeAgo } from "@/lib/constants";
import { REPORT_REASON_LABELS } from "../labels";

const M = defineMessages({
  en: {
    title: "Reports", lead: "Members can report a tutor or a member they talk to. The reported member is not told who reported them.",
    open: (n: number) => `To handle (${n})`, resolved: "Handled recently", none: "No reports to handle.", by: "Reported by", about: "about",
    on: (ago: string) => `${ago}`, handled: (who: string, ago: string) => `Handled by ${who}, ${ago}`, open_member: "Open the member page", status: "account",
  },
  fr: {
    title: "Signalements", lead: "Les membres peuvent signaler un tuteur ou un membre avec qui ils échangent. Le membre signalé ne sait pas qui l'a signalé.",
    open: (n: number) => `À traiter (${n})`, resolved: "Traités récemment", none: "Aucun signalement à traiter.", by: "Signalé par", about: "concernant",
    on: (ago: string) => `${ago}`, handled: (who: string, ago: string) => `Traité par ${who}, ${ago}`, open_member: "Ouvrir la fiche du membre", status: "compte",
  },
});

export const generateMetadata = () => titled({ en: "Reports", fr: "Signalements" });

export default async function ReportsPage() {
  await requireAdmin();
  const locale = await getLocale();
  const t = M[locale];
  const { open, resolved } = await listReports();

  const card = (r: ReportView, handled: boolean) => (
    <article key={r.id} className="card space-y-2 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip bg-clay-100 text-clay-800"><Flag size={12} /> {REPORT_REASON_LABELS[locale][r.reason]}</span>
        <Link href={`/utilisateurs/${r.target.id}`} className="font-semibold hover:text-clay-700">{r.target.name}</Link>
        <span className="text-xs text-earth-500">{r.target.role} · {t.status} {r.target.status} · {t.on(timeAgo(r.created_at, locale))}</span>
      </div>
      <p className="whitespace-pre-line text-sm text-earth-800">{r.details}</p>
      <p className="text-xs text-earth-500">{t.by} <Link href={`/utilisateurs/${r.reporter.id}`} className="underline">{r.reporter.name}</Link></p>
      {handled ? (
        <p className="rounded-xl bg-forest-100/60 p-2 text-sm text-forest-800">
          {r.resolved_at && t.handled(r.resolved_by ?? "—", timeAgo(r.resolved_at, locale))}{r.resolution && ` · ${r.resolution}`}
        </p>
      ) : (
        <div className="flex flex-wrap items-start gap-2 pt-1">
          <Link href={`/utilisateurs/${r.target.id}`} className="btn-dark">{t.open_member}</Link>
          <ResolveReportForm reportId={r.id} />
        </div>
      )}
    </article>
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">{t.title}</h1>
        <p className="mt-1 text-earth-600">{t.lead}</p>
      </header>
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">{t.open(open.length)}</h2>
        {open.length ? open.map((r) => card(r, false)) : <EmptyState title={t.none} />}
      </section>
      {resolved.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold">{t.resolved}</h2>
          {resolved.map((r) => card(r, true))}
        </section>
      )}
    </div>
  );
}

import Link from "next/link";
import { AlertTriangle, Wallet } from "lucide-react";
import { PayoutForm } from "@/components/admin/OpsForms";
import { SubmitButton } from "@/components/client";
import { EmptyState } from "@/components/ui";
import { defineMessages, intlLocale } from "@/i18n";
import { countryName } from "@/i18n/catalog";
import { getLocale, titled } from "@/i18n/server";
import { markRefunded } from "@/lib/actions/admin-ops";
import { getPayoutsOverview } from "@/lib/admin-ops";
import { requireAdmin } from "@/lib/auth";
import { formatPrice, timeAgo } from "@/lib/constants";
import { formatMoney } from "@/lib/payments/countries";

const M = defineMessages({
  en: {
    title: "Payments", lead: (pct: number) => `What Riya owes each tutor for their completed lessons (after the ${pct}% commission), the payouts already made, and refunds to finish by hand.`,
    owed: "To pay out to tutors", total: (amount: string) => `Total owed: ${amount}`, none: "Nothing to pay out: every completed lesson has been paid out.",
    tutor: "Tutor", lessons: "Lessons", gross: "Paid by students", net: "To pay out", since: "Oldest lesson",
    hint: "Pay the tutor (mobile money or bank transfer), then record the payout with its reference: the tutor is told by e-mail and these lessons leave the list.",
    refunds: "Refunds to finish by hand", refundsLead: "The payment provider refused these refunds: refund the student yourself, then mark it as done.",
    student: "Student", amount: "Amount", reference: "Reference", done: "Mark as refunded", payouts: "Latest payouts", noPayouts: "No payouts recorded yet.",
    by: (who: string) => `recorded by ${who}`,
  },
  fr: {
    title: "Paiements", lead: (pct: number) => `Ce que Riya doit à chaque tuteur pour ses cours terminés (après la commission de ${pct} %), les versements déjà faits, et les remboursements à terminer à la main.`,
    owed: "À verser aux tuteurs", total: (amount: string) => `Total dû : ${amount}`, none: "Rien à verser : tous les cours terminés ont été versés.",
    tutor: "Tuteur", lessons: "Cours", gross: "Payé par les élèves", net: "À verser", since: "Plus ancien cours",
    hint: "Payez le tuteur (mobile money ou virement), puis enregistrez le versement avec sa référence : le tuteur est prévenu par e-mail et ces cours sortent de la liste.",
    refunds: "Remboursements à terminer à la main", refundsLead: "Le prestataire de paiement a refusé ces remboursements : remboursez l'élève vous-même, puis marquez-le comme fait.",
    student: "Élève", amount: "Montant", reference: "Référence", done: "Marquer remboursé", payouts: "Derniers versements", noPayouts: "Aucun versement enregistré pour l'instant.",
    by: (who: string) => `enregistré par ${who}`,
  },
});

export const generateMetadata = () => titled({ en: "Payments", fr: "Paiements" });

export default async function PaymentsAdminPage() {
  await requireAdmin();
  const locale = await getLocale();
  const t = M[locale];
  const o = await getPayoutsOverview();
  const totalOwed = o.owed.reduce((sum, r) => sum + r.net, 0);
  const date = (iso: string) => new Date(iso).toLocaleDateString(intlLocale(locale), { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">{t.title}</h1>
        <p className="mt-1 text-earth-600">{t.lead(Math.round(o.commission * 100))}</p>
      </header>

      <section className="card space-y-3 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><Wallet size={20} /> {t.owed}</h2>
          {o.owed.length > 0 && <p className="font-semibold">{t.total(formatPrice(Math.round(totalOwed * 100) / 100, locale))}</p>}
        </div>
        {o.owed.length ? (
          <>
            <p className="text-sm text-earth-600">{t.hint}</p>
            <ul className="divide-y divide-sand-200">
              {o.owed.map((r) => (
                <li key={r.tutor_id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <Link href={`/utilisateurs/${r.tutor_id}`} className="font-semibold hover:text-clay-700">{r.name}</Link>
                    <p className="text-sm text-earth-500">{r.email}{r.country && ` · ${countryName(r.country, locale)}`}</p>
                    <p className="text-sm text-earth-600">
                      {t.lessons}: <strong>{r.lessons}</strong> · {t.gross}: {formatPrice(r.gross, locale)} · {t.since}: {date(r.oldest)}
                    </p>
                  </div>
                  <p className="text-2xl font-semibold tabular-nums">{formatPrice(r.net, locale)}</p>
                  <div className="lg:w-80"><PayoutForm tutorId={r.tutor_id} /></div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyState title={t.none} />
        )}
      </section>

      {o.failedRefunds.length > 0 && (
        <section className="card space-y-3 border-clay-200 p-5">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-clay-800"><AlertTriangle size={20} /> {t.refunds}</h2>
          <p className="text-sm text-earth-600">{t.refundsLead}</p>
          <ul className="divide-y divide-sand-200 text-sm">
            {o.failedRefunds.map((r) => (
              <li key={r.lesson_id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/utilisateurs/${r.student_id}`} className="font-semibold hover:text-clay-700">{r.student}</Link>
                  <span className="text-earth-500"> · {r.tutor} · {date(r.starts_at)}</span>
                  <p className="text-xs text-earth-500">{t.reference}: {r.reference}{r.provider_tx && ` · ${r.provider_tx}`}</p>
                </div>
                <span className="font-semibold">{formatMoney(r.amount, r.currency, locale)}</span>
                <form action={markRefunded.bind(null, r.lesson_id)}><SubmitButton className="btn-outline">{t.done}</SubmitButton></form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card space-y-3 p-5">
        <h2 className="font-display text-xl font-semibold">{t.payouts}</h2>
        {o.payouts.length ? (
          <ul className="divide-y divide-sand-200 text-sm">
            {o.payouts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span>
                  <Link href={`/utilisateurs/${p.tutor_id}`} className="font-semibold hover:text-clay-700">{p.tutor}</Link>
                  <span className="text-earth-500"> · {p.lessons} {t.lessons.toLowerCase()} · {p.reference}</span>
                </span>
                <span className="text-right">
                  <span className="font-semibold tabular-nums">{formatPrice(p.amount, locale)}</span>
                  <span className="block text-xs text-earth-500">{timeAgo(p.at, locale)} · {t.by(p.admin)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-earth-600">{t.noPayouts}</p>
        )}
      </section>
    </div>
  );
}

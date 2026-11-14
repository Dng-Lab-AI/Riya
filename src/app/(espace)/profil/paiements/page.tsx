import Link from "next/link";
import { LocalDateTime } from "@/components/client";
import { EmptyState, EspaceHeader, Panel } from "@/components/ui";
import { defineMessages, type Locale } from "@/i18n";
import { countryName, methodText } from "@/i18n/catalog";
import { getLocale, titled } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { formatPrice } from "@/lib/constants";
import { FREE_CANCELLATION_HOURS, commissionRate, quoteLesson } from "@/lib/payments";
import { METHODS, findCountry, isKnownCountry, type MethodId } from "@/lib/payments/countries";
import { getStudentPayments, getTutorEarnings, type PaymentRow } from "@/lib/queries";

const STATUS_CLASSES: Record<PaymentRow["status"], string> = {
  paid: "bg-forest-100 text-forest-800",
  pending: "bg-ochre-100 text-ochre-800",
  failed: "bg-clay-100 text-clay-800",
  refunded: "bg-sand-200 text-earth-800",
  refund_failed: "bg-ochre-100 text-ochre-800",
};

const M = defineMessages<{
  status: Record<PaymentRow["status"], string>; title: string; lead: string; how: string; basedOn: (country: string) => string; notSet: string;
  personal: string; currency: string; refund: (hours: number) => string; history: string; lesson: string; date: string;
  method: string; amount: string; statusCol: string; with: string; noPayments: string; noPaymentsText: string; earnings: string;
  earningsLead: (pct: number) => string; thisMonth: string; sinceStart: string; completed: string; perLesson: string; payouts: string;
  price: string; youReceive: string; noEarnings: string; noEarningsText: string;
}>({
  en: {
    status: { paid: "Paid", pending: "Pending", failed: "Failed", refunded: "Refunded", refund_failed: "Refund in progress" },
    title: "Payments", lead: "Your payment methods and the history of the lessons you've paid for.", how: "How you pay",
    basedOn: (country) => `Based on your country of residence (${country}), which you can change in`, notSet: "not set",
    personal: "Personal details", currency: "Currency",
    refund: (hours) => `Full refund if the tutor declines or cancels, or if you cancel more than ${hours} hours before the lesson.`,
    history: "History", lesson: "Lesson", date: "Date", method: "Method", amount: "Amount", statusCol: "Status", with: "with",
    noPayments: "No payments yet", noPaymentsText: "Lessons you pay for online will appear here.", earnings: "Earnings",
    earningsLead: (pct) => `What you've earned from your completed lessons, after Riya's commission (${pct}%).`,
    thisMonth: "This month", sinceStart: "Since the start", completed: "Completed lessons", perLesson: "Breakdown by lesson",
    payouts: "Payouts to your mobile money or bank account are made by the Riya team.", price: "Price", youReceive: "You receive",
    noEarnings: "No earnings yet", noEarningsText: "Your earnings will appear here after your first completed lessons.",
  },
  fr: {
    status: { paid: "Payé", pending: "En attente", failed: "Non abouti", refunded: "Remboursé", refund_failed: "Remboursement en cours" },
    title: "Paiements", lead: "Vos moyens de paiement et l'historique de vos cours réglés.", how: "Comment vous payez",
    basedOn: (country) => `Selon votre pays de résidence (${country}), modifiable dans`, notSet: "non renseigné",
    personal: "Informations personnelles", currency: "Devise",
    refund: (hours) => `Remboursement complet si le tuteur refuse ou annule, ou si vous annulez plus de ${hours} h avant le cours.`,
    history: "Historique", lesson: "Cours", date: "Date", method: "Moyen", amount: "Montant", statusCol: "Statut", with: "avec",
    noPayments: "Aucun paiement pour l'instant", noPaymentsText: "Vos cours réglés en ligne apparaîtront ici.", earnings: "Revenus",
    earningsLead: (pct) => `Ce que vous avez gagné sur vos cours terminés, après la commission de Riya (${pct} %).`,
    thisMonth: "Ce mois-ci", sinceStart: "Depuis le début", completed: "Cours terminés", perLesson: "Détail par cours",
    payouts: "Les versements sur votre compte mobile money ou bancaire sont faits par l'équipe Riya.", price: "Prix", youReceive: "Vous recevez",
    noEarnings: "Pas encore de revenus", noEarningsText: "Vos gains apparaîtront ici après vos premiers cours terminés.",
  },
});

export async function generateMetadata() {
  return titled({ en: "Payments", fr: "Paiements" });
}

export default async function PaymentsPage() {
  const user = await requireUser("/profil/paiements");
  const locale = await getLocale();
  if (user.role === "tutor") return <TutorEarnings userId={user._id} locale={locale} />;
  const t = M[locale];

  const payments = await getStudentPayments(user._id);
  const country = findCountry(user.country);
  const quote = quoteLesson(isKnownCountry(country.name) ? country.name : "", 1);

  return (
    <>
      <EspaceHeader title={t.title}>{t.lead}</EspaceHeader>
      <div className="space-y-6">
        <Panel title={t.how} description={<>{t.basedOn(country.name ? countryName(country.name, locale) : t.notSet)} <Link href="/profil" className="font-semibold text-clay-700 underline">{t.personal}</Link>.</>}>
          <div className="flex flex-wrap gap-2">
            {quote.methods.map((id: MethodId) => {
              const method = methodText(id, METHODS[id], locale);
              return (
                <span key={id} className="rounded-2xl border border-sand-200 px-4 py-3">
                  <span className="block text-sm font-semibold">{method.label}</span>
                  <span className="block text-xs text-earth-500">{method.hint}</span>
                </span>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-earth-600">
            {t.currency}: <strong>{quote.currency}</strong>. {t.refund(FREE_CANCELLATION_HOURS)}
          </p>
        </Panel>

        <Panel title={t.history}>
          {payments.length ? (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-earth-500">
                  <tr><th className="px-2 py-2 font-semibold">{t.lesson}</th><th className="px-2 py-2 font-semibold">{t.date}</th><th className="px-2 py-2 font-semibold">{t.method}</th><th className="px-2 py-2 text-right font-semibold">{t.amount}</th><th className="px-2 py-2 font-semibold">{t.statusCol}</th></tr>
                </thead>
                <tbody className="divide-y divide-sand-200">
                  {payments.map((p) => (
                    <tr key={p.lesson_id}>
                      <td className="px-2 py-3"><span className="font-semibold">{p.language_name}</span> <span className="text-earth-500">{t.with} {p.other_name}</span></td>
                      <td className="px-2 py-3 text-earth-600"><LocalDateTime iso={p.starts_at} mode="date" /></td>
                      <td className="px-2 py-3 text-earth-600">{p.method ? (METHODS[p.method as MethodId] ? methodText(p.method, METHODS[p.method as MethodId], locale).label : p.method) : "—"}</td>
                      <td className="px-2 py-3 text-right font-semibold tabular-nums">{p.amount_label}</td>
                      <td className="px-2 py-3"><span className={`chip ${STATUS_CLASSES[p.status]}`}>{t.status[p.status]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title={t.noPayments}>{t.noPaymentsText}</EmptyState>
          )}
        </Panel>
      </div>
    </>
  );
}

async function TutorEarnings({ userId, locale }: { userId: Parameters<typeof getTutorEarnings>[0]; locale: Locale }) {
  const t = M[locale];
  const commission = commissionRate();
  const rows = await getTutorEarnings(userId, commission);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const total = rows.reduce((sum, r) => sum + r.net, 0);
  const thisMonth = rows.filter((r) => r.starts_at >= monthStart).reduce((sum, r) => sum + r.net, 0);
  const round = (n: number) => Math.round(n * 100) / 100;

  return (
    <>
      <EspaceHeader title={t.earnings}>{t.earningsLead(Math.round(commission * 100))}</EspaceHeader>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.5rem] bg-forest-800 p-5 text-sand-50">
            <p className="text-sm text-sand-200">{t.thisMonth}</p>
            <p className="mt-1 text-3xl font-semibold">{formatPrice(round(thisMonth), locale)}</p>
          </div>
          <div className="rounded-[1.5rem] border border-sand-200 bg-white p-5">
            <p className="text-sm text-earth-500">{t.sinceStart}</p>
            <p className="mt-1 text-3xl font-semibold">{formatPrice(round(total), locale)}</p>
          </div>
          <div className="rounded-[1.5rem] border border-sand-200 bg-white p-5">
            <p className="text-sm text-earth-500">{t.completed}</p>
            <p className="mt-1 text-3xl font-semibold">{rows.length}</p>
          </div>
        </div>

        <Panel title={t.perLesson} description={t.payouts}>
          {rows.length ? (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-earth-500">
                  <tr><th className="px-2 py-2 font-semibold">{t.lesson}</th><th className="px-2 py-2 font-semibold">{t.date}</th><th className="px-2 py-2 text-right font-semibold">{t.price}</th><th className="px-2 py-2 text-right font-semibold">{t.youReceive}</th></tr>
                </thead>
                <tbody className="divide-y divide-sand-200">
                  {rows.map((r) => (
                    <tr key={r.lesson_id}>
                      <td className="px-2 py-3"><span className="font-semibold">{r.language_name}</span> <span className="text-earth-500">{t.with} {r.other_name}</span></td>
                      <td className="px-2 py-3 text-earth-600"><LocalDateTime iso={r.starts_at} mode="date" /></td>
                      <td className="px-2 py-3 text-right tabular-nums text-earth-600">{formatPrice(r.price, locale)}</td>
                      <td className="px-2 py-3 text-right font-semibold tabular-nums">{formatPrice(r.net, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title={t.noEarnings}>{t.noEarningsText}</EmptyState>
          )}
        </Panel>
      </div>
    </>
  );
}

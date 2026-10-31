import type { Metadata } from "next";
import Link from "next/link";
import { LocalDateTime } from "@/components/client";
import { EmptyState, EspaceHeader, Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatPrice } from "@/lib/constants";
import { FREE_CANCELLATION_HOURS, commissionRate, quoteLesson } from "@/lib/payments";
import { METHODS, findCountry, isKnownCountry, type MethodId } from "@/lib/payments/countries";
import { getStudentPayments, getTutorEarnings, type PaymentRow } from "@/lib/queries";

export const metadata: Metadata = { title: "Paiements" };

const STATUS: Record<PaymentRow["status"], { label: string; className: string }> = {
  paid: { label: "Payé", className: "bg-forest-100 text-forest-800" },
  pending: { label: "En attente", className: "bg-ochre-100 text-ochre-800" },
  failed: { label: "Non abouti", className: "bg-clay-100 text-clay-800" },
  refunded: { label: "Remboursé", className: "bg-sand-200 text-earth-800" },
  refund_failed: { label: "Remboursement en cours", className: "bg-ochre-100 text-ochre-800" },
};

export default async function PaymentsPage() {
  const user = await requireUser("/profil/paiements");
  if (user.role === "tutor") return <TutorEarnings userId={user._id} />;

  const payments = await getStudentPayments(user._id);
  const country = findCountry(user.country);
  const quote = quoteLesson(isKnownCountry(country.name) ? country.name : "", 1);

  return (
    <>
      <EspaceHeader title="Paiements">Vos moyens de paiement et l&apos;historique de vos cours réglés.</EspaceHeader>
      <div className="space-y-6">
        <Panel title="Comment vous payez" description={<>Selon votre pays de résidence ({country.name || "non renseigné"}), modifiable dans <Link href="/profil" className="font-semibold text-clay-700 underline">Informations personnelles</Link>.</>}>
          <div className="flex flex-wrap gap-2">
            {quote.methods.map((id: MethodId) => (
              <span key={id} className="rounded-2xl border border-sand-200 px-4 py-3">
                <span className="block text-sm font-semibold">{METHODS[id].label}</span>
                <span className="block text-xs text-earth-500">{METHODS[id].hint}</span>
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-earth-600">
            Devise : <strong>{quote.currency}</strong>. Remboursement complet si le tuteur refuse ou annule, ou si vous annulez plus de {FREE_CANCELLATION_HOURS} h avant le cours.
          </p>
        </Panel>

        <Panel title="Historique">
          {payments.length ? (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-earth-500">
                  <tr><th className="px-2 py-2 font-semibold">Cours</th><th className="px-2 py-2 font-semibold">Date</th><th className="px-2 py-2 font-semibold">Moyen</th><th className="px-2 py-2 text-right font-semibold">Montant</th><th className="px-2 py-2 font-semibold">Statut</th></tr>
                </thead>
                <tbody className="divide-y divide-sand-200">
                  {payments.map((p) => (
                    <tr key={p.lesson_id}>
                      <td className="px-2 py-3"><span className="font-semibold">{p.language_name}</span> <span className="text-earth-500">avec {p.other_name}</span></td>
                      <td className="px-2 py-3 text-earth-600"><LocalDateTime iso={p.starts_at} mode="date" /></td>
                      <td className="px-2 py-3 text-earth-600">{p.method ? (METHODS[p.method as MethodId]?.label ?? p.method) : "—"}</td>
                      <td className="px-2 py-3 text-right font-semibold tabular-nums">{p.amount_label}</td>
                      <td className="px-2 py-3"><span className={`chip ${STATUS[p.status].className}`}>{STATUS[p.status].label}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Aucun paiement pour l'instant">Vos cours réglés en ligne apparaîtront ici.</EmptyState>
          )}
        </Panel>
      </div>
    </>
  );
}

async function TutorEarnings({ userId }: { userId: Parameters<typeof getTutorEarnings>[0] }) {
  const commission = commissionRate();
  const rows = await getTutorEarnings(userId, commission);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const total = rows.reduce((sum, r) => sum + r.net, 0);
  const thisMonth = rows.filter((r) => r.starts_at >= monthStart).reduce((sum, r) => sum + r.net, 0);
  const round = (n: number) => Math.round(n * 100) / 100;

  return (
    <>
      <EspaceHeader title="Revenus">Ce que vous avez gagné sur vos cours terminés, après la commission de Riya ({Math.round(commission * 100)} %).</EspaceHeader>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.5rem] bg-forest-800 p-5 text-sand-50">
            <p className="text-sm text-sand-200">Ce mois-ci</p>
            <p className="mt-1 text-3xl font-semibold">{formatPrice(round(thisMonth))}</p>
          </div>
          <div className="rounded-[1.5rem] border border-sand-200 bg-white p-5">
            <p className="text-sm text-earth-500">Depuis le début</p>
            <p className="mt-1 text-3xl font-semibold">{formatPrice(round(total))}</p>
          </div>
          <div className="rounded-[1.5rem] border border-sand-200 bg-white p-5">
            <p className="text-sm text-earth-500">Cours terminés</p>
            <p className="mt-1 text-3xl font-semibold">{rows.length}</p>
          </div>
        </div>

        <Panel title="Détail par cours" description="Les versements sur votre compte mobile money ou bancaire sont faits par l'équipe Riya.">
          {rows.length ? (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-earth-500">
                  <tr><th className="px-2 py-2 font-semibold">Cours</th><th className="px-2 py-2 font-semibold">Date</th><th className="px-2 py-2 text-right font-semibold">Prix</th><th className="px-2 py-2 text-right font-semibold">Vous recevez</th></tr>
                </thead>
                <tbody className="divide-y divide-sand-200">
                  {rows.map((r) => (
                    <tr key={r.lesson_id}>
                      <td className="px-2 py-3"><span className="font-semibold">{r.language_name}</span> <span className="text-earth-500">avec {r.other_name}</span></td>
                      <td className="px-2 py-3 text-earth-600"><LocalDateTime iso={r.starts_at} mode="date" /></td>
                      <td className="px-2 py-3 text-right tabular-nums text-earth-600">{formatPrice(r.price)}</td>
                      <td className="px-2 py-3 text-right font-semibold tabular-nums">{formatPrice(r.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Pas encore de revenus">Vos gains apparaîtront ici après vos premiers cours terminés.</EmptyState>
          )}
        </Panel>
      </div>
    </>
  );
}

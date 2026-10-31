import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, Clock, CircleX } from "lucide-react";
import { LocalDateTime } from "@/components/client";
import { payLesson } from "@/lib/actions/lessons";
import { requireUser } from "@/lib/auth";
import { first } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { confirmPayment } from "@/lib/payments";
import { formatMoney } from "@/lib/payments/countries";

export const metadata: Metadata = { title: "Paiement" };

// Where the student lands after the checkout page, whatever happened there.
export default async function PaymentReturnPage({ searchParams }: PageProps<"/paiement/retour">) {
  const user = await requireUser("/tableau-de-bord");
  const reference = first((await searchParams).tx_ref) ?? "";
  const lesson = reference.startsWith("riya-") ? await confirmPayment(reference) : null;
  if (!lesson?.payment || !lesson.studentId.equals(user._id)) {
    return <Result tone="error" title="Paiement introuvable">Retrouvez vos réservations dans <Link href="/tableau-de-bord" className="font-semibold underline">Mes cours</Link>.</Result>;
  }

  const tutor = await (await getDb()).users.findOne({ _id: lesson.tutorId }, { projection: { name: 1 } });
  const amount = formatMoney(lesson.payment.amount, lesson.payment.currency);
  const when = <LocalDateTime iso={lesson.startsAt.toISOString()} />;

  if (lesson.payment.status === "paid") {
    return (
      <Result tone="success" title="Paiement reçu, merci !">
        <p>Vous avez payé <strong>{amount}</strong> pour votre cours avec {tutor?.name} le {when}.</p>
        <p className="mt-2">{tutor?.name} va confirmer le créneau. Vous serez remboursé si le cours est refusé.</p>
        <Link href="/tableau-de-bord" className="btn-primary mt-6">Voir mes cours</Link>
      </Result>
    );
  }
  if (lesson.payment.status === "pending" && lesson.status === "pending") {
    return (
      <Result tone="pending" title="Paiement en cours de validation">
        <p>Si vous payez par mobile money, validez l&apos;opération sur votre téléphone. Cette page se met à jour quand vous la rechargez.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href={`/paiement/retour?tx_ref=${reference}`} className="btn-primary">Vérifier à nouveau</Link>
          <form action={payLesson.bind(null, lesson._id.toHexString())}><button className="btn-outline">Payer autrement</button></form>
        </div>
      </Result>
    );
  }
  return (
    <Result tone="error" title="Le paiement n'a pas abouti">
      <p>Aucun montant n&apos;a été débité pour votre cours du {when}.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {lesson.status === "pending" && <form action={payLesson.bind(null, lesson._id.toHexString())}><button className="btn-primary">Réessayer ({amount})</button></form>}
        <Link href="/tableau-de-bord" className="btn-outline">Mes cours</Link>
      </div>
    </Result>
  );
}

const TONES = {
  success: { icon: CircleCheck, className: "bg-forest-100 text-forest-700" },
  pending: { icon: Clock, className: "bg-ochre-100 text-ochre-800" },
  error: { icon: CircleX, className: "bg-clay-100 text-clay-700" },
};

function Result({ tone, title, children }: { tone: keyof typeof TONES; title: string; children: React.ReactNode }) {
  const { icon: Icon, className } = TONES[tone];
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${className}`}><Icon size={32} /></span>
      <h1 className="mt-6 font-display text-3xl font-semibold">{title}</h1>
      <div className="mt-3 text-earth-600">{children}</div>
    </div>
  );
}

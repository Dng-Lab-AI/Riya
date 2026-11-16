import Link from "next/link";
import { CircleCheck, Clock, CircleX } from "lucide-react";
import { LocalDateTime } from "@/components/client";
import { defineMessages } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { payLesson } from "@/lib/actions/lessons";
import { requireUser } from "@/lib/auth";
import { first } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { confirmPayment } from "@/lib/payments";
import { formatMoney } from "@/lib/payments/countries";

const M = defineMessages({
  en: {
    notFound: "Payment not found", findIn: "Find your bookings in", myLessons: "My lessons",
    paid: "Payment received, thank you!", youPaid: "You paid", forLesson: "for your lesson with", on: "on",
    willConfirm: (name: string) => `${name} will confirm the slot. You'll be refunded if the lesson is declined.`, seeLessons: "See my lessons",
    pendingTitle: "Payment being validated",
    pendingText: "If you're paying by mobile money, approve the operation on your phone. This page updates when you reload it.",
    checkAgain: "Check again", payOther: "Pay another way", failed: "The payment didn't go through",
    nothing: "No money was taken for your lesson on", retry: "Try again",
  },
  fr: {
    notFound: "Paiement introuvable", findIn: "Retrouvez vos réservations dans", myLessons: "Mes cours",
    paid: "Paiement reçu, merci !", youPaid: "Vous avez payé", forLesson: "pour votre cours avec", on: "le",
    willConfirm: (name: string) => `${name} va confirmer le créneau. Vous serez remboursé si le cours est refusé.`, seeLessons: "Voir mes cours",
    pendingTitle: "Paiement en cours de validation",
    pendingText: "Si vous payez par mobile money, validez l'opération sur votre téléphone. Cette page se met à jour quand vous la rechargez.",
    checkAgain: "Vérifier à nouveau", payOther: "Payer autrement", failed: "Le paiement n'a pas abouti",
    nothing: "Aucun montant n'a été débité pour votre cours du", retry: "Réessayer",
  },
});

export const generateMetadata = () => titled({ en: "Payment", fr: "Paiement" });

// Where the student lands after the checkout page, whatever happened there.
export default async function PaymentReturnPage({ searchParams }: PageProps<"/paiement/retour">) {
  const user = await requireUser("/tableau-de-bord");
  const locale = await getLocale();
  const t = M[locale];
  const reference = first((await searchParams).tx_ref) ?? "";
  const lesson = reference.startsWith("riya-") ? await confirmPayment(reference) : null;
  if (!lesson?.payment || !lesson.studentId.equals(user._id)) {
    return <Result tone="error" title={t.notFound}>{t.findIn} <Link href="/tableau-de-bord" className="font-semibold underline">{t.myLessons}</Link>.</Result>;
  }

  const tutor = await (await getDb()).users.findOne({ _id: lesson.tutorId }, { projection: { name: 1 } });
  const amount = formatMoney(lesson.payment.amount, lesson.payment.currency, locale);
  const when = <LocalDateTime iso={lesson.startsAt.toISOString()} />;

  if (lesson.payment.status === "paid") {
    return (
      <Result tone="success" title={t.paid}>
        <p>{t.youPaid} <strong>{amount}</strong> {t.forLesson} {tutor?.name} {t.on} {when}.</p>
        <p className="mt-2">{t.willConfirm(tutor?.name ?? "")}</p>
        <Link href="/tableau-de-bord" className="btn-primary mt-6">{t.seeLessons}</Link>
      </Result>
    );
  }
  if (lesson.payment.status === "pending" && lesson.status === "pending") {
    return (
      <Result tone="pending" title={t.pendingTitle}>
        <p>{t.pendingText}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href={`/paiement/retour?tx_ref=${reference}`} className="btn-primary">{t.checkAgain}</Link>
          <form action={payLesson.bind(null, lesson._id.toHexString())}><button className="btn-outline">{t.payOther}</button></form>
        </div>
      </Result>
    );
  }
  return (
    <Result tone="error" title={t.failed}>
      <p>{t.nothing} {when}.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {lesson.status === "pending" && <form action={payLesson.bind(null, lesson._id.toHexString())}><button className="btn-primary">{t.retry} ({amount})</button></form>}
        <Link href="/tableau-de-bord" className="btn-outline">{t.myLessons}</Link>
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

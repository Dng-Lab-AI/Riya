import Link from "next/link";
import { CalendarPlus, CalendarSearch, MessageCircle, NotebookText, Star, Video, Wallet } from "lucide-react";
import { LessonWhen } from "@/components/TutorHomeClient";
import { Avatar } from "@/components/ui";
import { defineMessages } from "@/i18n";
import { getLocale } from "@/i18n/server";
import type { Lesson } from "@/lib/queries";

// Top of the student's "My lessons": the next lesson in big, then what needs their attention.

const M = defineMessages({
  en: {
    started: "Your lesson has started", next: "Your next lesson", enter: "Enter the classroom", write: "Write", notes: "Lesson notes",
    test: "Test your camera and microphone by going in a few minutes before the start.",
    none: "No confirmed lessons coming up", noneText: "Book your next slot to keep up the rhythm.", book: "Book a lesson",
    proposals: (n: number, name: string) => (n > 1 ? `${n} lessons proposed by ${name}` : `${name} is proposing a lesson`),
    proposalsText: "Accept them (“Accept and pay”) to confirm them, or decline them.",
    toPay: (n: number) => (n > 1 ? `${n} bookings are waiting for your payment` : "A booking is waiting for your payment"),
    toPayText: "The tutor only sees it once it's paid. An unpaid slot is released after 30 minutes.",
    review: (name: string) => `How was your lesson with ${name}?`, reviewText: "Your review helps other students choose their tutor.",
  },
  fr: {
    started: "Votre cours a commencé", next: "Votre prochain cours", enter: "Entrer en classe", write: "Écrire", notes: "Notes du cours",
    test: "Testez votre caméra et votre micro en entrant quelques minutes avant le début.",
    none: "Aucun cours confirmé à venir", noneText: "Réservez votre prochain créneau pour garder le rythme.", book: "Réserver un cours",
    proposals: (n: number, name: string) => (n > 1 ? `${n} cours proposés par ${name}` : `${name} vous propose un cours`),
    proposalsText: "Acceptez-les (« Accepter et payer ») pour les confirmer, ou refusez-les.",
    toPay: (n: number) => (n > 1 ? `${n} réservations attendent votre paiement` : "Une réservation attend votre paiement"),
    toPayText: "Le tuteur ne la voit qu'une fois payée. Un créneau non payé est libéré au bout de 30 minutes.",
    review: (name: string) => `Comment s'est passé votre cours avec ${name} ?`, reviewText: "Votre avis aide les autres élèves à choisir leur tuteur.",
  },
});

function highlightsOf(lessons: Lesson[]) {
  const now = Date.now();
  const start = (l: Lesson) => new Date(l.starts_at).getTime();
  const next = lessons
    .filter((l) => l.status === "confirmed" && start(l) + (l.duration_minutes + 30) * 60 * 1000 > now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
  const upcoming = lessons.filter((l) => l.status === "pending" && start(l) > now);
  // Lessons the tutor scheduled from their calendar: the student accepts (and pays) them.
  const proposals = upcoming.filter((l) => l.proposed_by_tutor);
  const toPay = upcoming.filter((l) => !l.proposed_by_tutor && (l.payment?.status === "pending" || l.payment?.status === "failed"));
  const toReview = lessons.filter((l) => l.status === "completed" && !l.review_rating).sort((a, b) => b.starts_at.localeCompare(a.starts_at))[0];
  return { next, proposals, toPay, toReview, live: !!next && start(next) <= now };
}

export async function StudentHighlights({ lessons }: { lessons: Lesson[] }) {
  const t = M[await getLocale()];
  const { next, proposals, toPay, toReview, live } = highlightsOf(lessons);
  const hasActions = proposals.length > 0 || toPay.length > 0 || !!toReview;

  return (
    <div className={`grid gap-4 ${hasActions ? "lg:grid-cols-[3fr_2fr]" : ""}`}>
      {next ? (
        <section className="relative overflow-hidden rounded-[1.75rem] bg-forest-800 p-6 text-sand-50 sm:p-7">
          <div className="pattern-kente absolute inset-y-0 right-0 hidden w-24 opacity-20 sm:block" />
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-ochre-300">{live ? t.started : t.next}</p>
          <div className="mt-4 flex items-center gap-4">
            <Avatar name={next.other_name} src={next.other_avatar} size={60} className="rounded-2xl" />
            <div className="min-w-0">
              <Link href={`/tuteurs/${next.other_id}`} className="font-display text-2xl font-semibold hover:underline">{next.other_name}</Link>
              <p className="text-sand-200"><LessonWhen iso={next.starts_at} minutes={next.duration_minutes} /> · {next.language_name}</p>
            </div>
          </div>
          <div className="relative mt-5 flex flex-wrap gap-2">
            <Link href={`/classe/${next.id}`} className="btn bg-ochre-400 text-forest-900 hover:bg-ochre-300"><Video size={16} /> {t.enter}</Link>
            <Link href={`/messages/${next.other_id}`} className="btn border border-white/20 text-sand-50 hover:bg-white/10"><MessageCircle size={16} /> {t.write}</Link>
            <Link href={`/cours/${next.id}`} className="btn border border-white/20 text-sand-50 hover:bg-white/10"><NotebookText size={16} /> {t.notes}</Link>
          </div>
          <p className="relative mt-4 text-xs text-sand-300">{t.test}</p>
        </section>
      ) : (
        <section className="flex flex-col justify-between gap-4 rounded-[1.75rem] bg-sand-100 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-xl font-semibold">{t.none}</p>
            <p className="mt-1 text-sm text-earth-600">{t.noneText}</p>
          </div>
          <Link href="/tuteurs" className="btn-primary shrink-0"><CalendarSearch size={16} /> {t.book}</Link>
        </section>
      )}

      {hasActions && (
        <div className="space-y-3">
          {proposals.length > 0 && (
            <a href="#cours-a-venir" className="flex items-start gap-3 rounded-[1.5rem] border border-clay-200 bg-clay-50 p-4 text-clay-800 transition hover:bg-clay-100">
              <CalendarPlus size={20} className="mt-0.5 shrink-0" />
              <span>
                <span className="block font-semibold">{t.proposals(proposals.length, proposals[0].other_name.split(" ")[0])}</span>
                <span className="text-sm">{t.proposalsText}</span>
              </span>
            </a>
          )}
          {toPay.length > 0 && (
            <a href="#cours-a-venir" className="flex items-start gap-3 rounded-[1.5rem] border border-ochre-300 bg-ochre-100 p-4 text-ochre-800 transition hover:bg-ochre-100/70">
              <Wallet size={20} className="mt-0.5 shrink-0" />
              <span>
                <span className="block font-semibold">{t.toPay(toPay.length)}</span>
                <span className="text-sm">{t.toPayText}</span>
              </span>
            </a>
          )}
          {toReview && (
            <a href="#cours-passes" className="flex items-start gap-3 rounded-[1.5rem] border border-sand-200 bg-white p-4 transition hover:bg-sand-50">
              <Star size={20} className="mt-0.5 shrink-0 fill-ochre-400 text-ochre-400" />
              <span>
                <span className="block font-semibold">{t.review(toReview.other_name.split(" ")[0])}</span>
                <span className="text-sm text-earth-600">{t.reviewText}</span>
              </span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

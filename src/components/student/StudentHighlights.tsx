import Link from "next/link";
import { CalendarPlus, CalendarSearch, MessageCircle, NotebookText, Star, Video, Wallet } from "lucide-react";
import { LessonWhen } from "@/components/TutorHomeClient";
import { Avatar } from "@/components/ui";
import type { Lesson } from "@/lib/queries";

// Top of the student's "Mes cours": the next lesson in big, then what needs their attention.

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

export function StudentHighlights({ lessons }: { lessons: Lesson[] }) {
  const { next, proposals, toPay, toReview, live } = highlightsOf(lessons);
  const hasActions = proposals.length > 0 || toPay.length > 0 || !!toReview;

  return (
    <div className={`grid gap-4 ${hasActions ? "lg:grid-cols-[3fr_2fr]" : ""}`}>
      {next ? (
        <section className="relative overflow-hidden rounded-[1.75rem] bg-forest-800 p-6 text-sand-50 sm:p-7">
          <div className="pattern-kente absolute inset-y-0 right-0 hidden w-24 opacity-20 sm:block" />
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-ochre-300">{live ? "Votre cours a commencé" : "Votre prochain cours"}</p>
          <div className="mt-4 flex items-center gap-4">
            <Avatar name={next.other_name} src={next.other_avatar} size={60} className="rounded-2xl" />
            <div className="min-w-0">
              <Link href={`/tuteurs/${next.other_id}`} className="font-display text-2xl font-semibold hover:underline">{next.other_name}</Link>
              <p className="text-sand-200"><LessonWhen iso={next.starts_at} minutes={next.duration_minutes} /> · {next.language_name}</p>
            </div>
          </div>
          <div className="relative mt-5 flex flex-wrap gap-2">
            <Link href={`/classe/${next.id}`} className="btn bg-ochre-400 text-forest-900 hover:bg-ochre-300"><Video size={16} /> Entrer en classe</Link>
            <Link href={`/messages/${next.other_id}`} className="btn border border-white/20 text-sand-50 hover:bg-white/10"><MessageCircle size={16} /> Écrire</Link>
            <Link href={`/cours/${next.id}`} className="btn border border-white/20 text-sand-50 hover:bg-white/10"><NotebookText size={16} /> Notes du cours</Link>
          </div>
          <p className="relative mt-4 text-xs text-sand-300">Testez votre caméra et votre micro en entrant quelques minutes avant le début.</p>
        </section>
      ) : (
        <section className="flex flex-col justify-between gap-4 rounded-[1.75rem] bg-sand-100 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-xl font-semibold">Aucun cours confirmé à venir</p>
            <p className="mt-1 text-sm text-earth-600">Réservez votre prochain créneau pour garder le rythme.</p>
          </div>
          <Link href="/tuteurs" className="btn-primary shrink-0"><CalendarSearch size={16} /> Réserver un cours</Link>
        </section>
      )}

      {hasActions && (
        <div className="space-y-3">
          {proposals.length > 0 && (
            <a href="#cours-a-venir" className="flex items-start gap-3 rounded-[1.5rem] border border-clay-200 bg-clay-50 p-4 text-clay-800 transition hover:bg-clay-100">
              <CalendarPlus size={20} className="mt-0.5 shrink-0" />
              <span>
                <span className="block font-semibold">
                  {proposals.length > 1 ? `${proposals.length} cours proposés par ${proposals[0].other_name.split(" ")[0]}` : `${proposals[0].other_name.split(" ")[0]} vous propose un cours`}
                </span>
                <span className="text-sm">Acceptez-les (« Accepter et payer ») pour les confirmer, ou refusez-les.</span>
              </span>
            </a>
          )}
          {toPay.length > 0 && (
            <a href="#cours-a-venir" className="flex items-start gap-3 rounded-[1.5rem] border border-ochre-300 bg-ochre-100 p-4 text-ochre-800 transition hover:bg-ochre-100/70">
              <Wallet size={20} className="mt-0.5 shrink-0" />
              <span>
                <span className="block font-semibold">
                  {toPay.length > 1 ? `${toPay.length} réservations attendent votre paiement` : "Une réservation attend votre paiement"}
                </span>
                <span className="text-sm">Le tuteur ne la voit qu&apos;une fois payée. Un créneau non payé est libéré au bout de 30 minutes.</span>
              </span>
            </a>
          )}
          {toReview && (
            <a href="#cours-passes" className="flex items-start gap-3 rounded-[1.5rem] border border-sand-200 bg-white p-4 transition hover:bg-sand-50">
              <Star size={20} className="mt-0.5 shrink-0 fill-ochre-400 text-ochre-400" />
              <span>
                <span className="block font-semibold">Comment s&apos;est passé votre cours avec {toReview.other_name.split(" ")[0]} ?</span>
                <span className="text-sm text-earth-600">Votre avis aide les autres élèves à choisir leur tuteur.</span>
              </span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BellRing, MessageCircle, NotebookText, Video } from "lucide-react";
import { LessonWhen, TutorGreeting } from "@/components/TutorHomeClient";
import { Avatar, EmptyState } from "@/components/ui";
import { defineMessages } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { getTutor, getTutorLessons, type Lesson } from "@/lib/queries";

const M = defineMessages({
  en: {
    feedbackTitle: "Students waiting for your feedback",
    feedbackText: (name: string, others: number) =>
      `${name}${others > 0 ? ` and ${others} other student${others > 1 ? "s" : ""} could` : " could"} use a little follow-up: key points, vocabulary and homework from the last session.`,
    giveFeedback: "Give feedback", live: "In progress", notes: "Lesson notes and summary", write: (name: string) => `Write to ${name}`, enter: "Enter the classroom",
    pendingProfile: "Your profile is being reviewed.", incompleteProfile: "Complete your profile to appear in searches.",
    profileText: "Students will be able to book you as soon as our team has approved your profile.", complete: "Complete my profile",
    requests: (n: number) => `${n} lesson request${n > 1 ? "s" : ""} waiting for your answer`, requestsText: "Answer quickly to reassure your students.",
    upcoming: "Coming up", calendar: "See the calendar", none: "No confirmed lessons coming up",
    noneText: "Your next lessons will appear here as soon as you've accepted them.",
  },
  fr: {
    feedbackTitle: "Élèves en attente de votre retour",
    feedbackText: (name: string, others: number) =>
      `${name}${others > 0 ? ` et ${others} autre${others > 1 ? "s" : ""} élève${others > 1 ? "s" : ""} pourraient` : " pourrait"} profiter d'un petit suivi : points clés, vocabulaire et devoirs de la dernière séance.`,
    giveFeedback: "Donner un retour", live: "En cours", notes: "Notes et résumé du cours", write: (name: string) => `Écrire à ${name}`, enter: "Entrer en classe",
    pendingProfile: "Votre profil est en cours de validation.", incompleteProfile: "Complétez votre profil pour apparaître dans les recherches.",
    profileText: "Les élèves pourront vous réserver dès que notre équipe aura validé votre profil.", complete: "Compléter mon profil",
    requests: (n: number) => `${n} demande${n > 1 ? "s" : ""} de cours en attente de votre réponse`, requestsText: "Répondez rapidement pour rassurer vos élèves.",
    upcoming: "À venir", calendar: "Voir le calendrier", none: "Aucun cours confirmé à venir",
    noneText: "Vos prochains cours apparaîtront ici dès que vous les aurez acceptés.",
  },
});

type Texts = (typeof M)["en"];

export const generateMetadata = () => titled({ en: "Home", fr: "Accueil" });

const startOf = (l: Lesson) => new Date(l.starts_at).getTime();
const hasStarted = (l: Lesson) => startOf(l) <= Date.now();
// A confirmed lesson stays joinable until 30 minutes after its end.
const notOverYet = (l: Lesson) => startOf(l) + (l.duration_minutes + 30) * 60 * 1000 > Date.now();
const byDateAsc = (a: Lesson, b: Lesson) => a.starts_at.localeCompare(b.starts_at);

// A lesson given in the last 30 days for which the tutor has not written any notes yet.
const FEEDBACK_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const awaitsFeedback = (l: Lesson) =>
  !l.has_notes && (l.status === "completed" || (l.status === "confirmed" && hasStarted(l) && !notOverYet(l))) && Date.now() - startOf(l) < FEEDBACK_WINDOW_MS;

function FeedbackPrompt({ lessons, t }: { lessons: Lesson[]; t: Texts }) {
  // One entry per student (their latest lesson), most recent first.
  const latest = new Map<string, Lesson>();
  for (const l of lessons) {
    const previous = latest.get(l.other_id);
    if (!previous || l.starts_at > previous.starts_at) latest.set(l.other_id, l);
  }
  const students = [...latest.values()].sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const [first] = students;
  const others = students.length - 1;

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] bg-sand-100 p-6 sm:p-8">
      <div className="pattern-bogolan absolute inset-0 opacity-50" />
      <div className="relative max-w-2xl sm:pr-40">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t.feedbackTitle}</h2>
        <p className="mt-2 text-earth-700">{t.feedbackText(first.other_name.split(" ")[0], others)}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link href={`/cours/${first.id}`} className="btn-primary">{t.giveFeedback}</Link>
          {students.slice(1, 4).map((l) => (
            <Link key={l.id} href={`/cours/${l.id}`} className="chip bg-white hover:bg-clay-50">{l.other_name}</Link>
          ))}
        </div>
      </div>
      <svg viewBox="0 0 120 120" className="pointer-events-none absolute right-4 top-1/2 hidden h-36 w-36 -translate-y-1/2 sm:block" aria-hidden>
        <rect x="52" y="34" width="62" height="78" rx="8" className="fill-ochre-100 stroke-ochre-500" strokeWidth="2" />
        <rect x="62" y="48" width="42" height="6" rx="3" className="fill-ochre-400" />
        <rect x="62" y="62" width="42" height="24" rx="4" className="fill-white stroke-ochre-500" strokeWidth="1.5" />
        <rect x="62" y="94" width="24" height="5" rx="2.5" className="fill-ochre-400" />
        <path d="M34 8 39 26 56 31 39 36 34 54 29 36 12 31 29 26Z" className="fill-clay-500" />
        <path d="M12 52 14.5 59 21 61.5 14.5 64 12 71 9.5 64 3 61.5 9.5 59Z" className="fill-clay-200" />
        <path d="M14 4 16 9.5 21.5 11.5 16 13.5 14 19 12 13.5 6.5 11.5 12 9.5Z" className="fill-ochre-400" />
      </svg>
    </section>
  );
}

function UpNextRow({ lesson, t }: { lesson: Lesson; t: Texts }) {
  const live = hasStarted(lesson);
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
      <Avatar name={lesson.other_name} src={lesson.other_avatar} size={52} className="rounded-2xl" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          {lesson.other_name}
          {live && <span className="chip bg-clay-600 text-white">{t.live}</span>}
        </p>
        <p className="text-sm text-earth-600"><LessonWhen iso={lesson.starts_at} minutes={lesson.duration_minutes} /> · {lesson.language_name}</p>
      </div>
      <div className="flex items-center gap-1">
        <Link href={`/cours/${lesson.id}`} className="btn-ghost" title={t.notes} aria-label={t.notes}><NotebookText size={20} /></Link>
        <Link href={`/messages/${lesson.other_id}`} className="btn-ghost" title={t.write(lesson.other_name)} aria-label={t.write(lesson.other_name)}><MessageCircle size={20} /></Link>
        <Link href={`/classe/${lesson.id}`} className="btn-dark ml-1"><Video size={16} /> {t.enter}</Link>
      </div>
    </li>
  );
}

// Landing page of the tutor space: a greeting, what needs attention, and the next lessons.
export default async function TutorHomePage() {
  const user = await requireUser("/accueil");
  if (user.role !== "tutor") redirect("/tableau-de-bord");

  const [lessons, profile, locale] = await Promise.all([getTutorLessons(user._id), getTutor(user.id), getLocale()]);
  const t = M[locale];
  // Bookings waiting for the tutor (not the lessons they proposed, which wait for the student).
  const requests = lessons.filter((l) => l.status === "pending" && !l.proposed_by_tutor && !hasStarted(l));
  const upNext = lessons.filter((l) => l.status === "confirmed" && notOverYet(l)).sort(byDateAsc);
  const waiting = lessons.filter(awaitsFeedback);

  return (
    <>
      <TutorGreeting firstName={user.name.split(" ")[0]} lessonStarts={upNext.map((l) => l.starts_at)} />

      <div className="space-y-8">
        {profile && (!profile.approved || !profile.headline) && (
          <div className="rounded-[1.5rem] bg-ochre-100 p-5 text-ochre-800">
            <p className="font-semibold">{profile.headline ? t.pendingProfile : t.incompleteProfile}</p>
            <p className="mt-1 text-sm">{t.profileText}</p>
            <Link href="/profil/tuteur" className="btn-dark mt-3">{t.complete}</Link>
          </div>
        )}

        {requests.length > 0 && (
          <Link href="/tableau-de-bord" className="flex items-center gap-4 rounded-[1.5rem] bg-forest-800 p-5 text-sand-50 transition hover:bg-forest-900">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-ochre-300"><BellRing size={22} /></span>
            <span className="flex-1">
              <span className="block font-semibold">{t.requests(requests.length)}</span>
              <span className="text-sm text-sand-200">{t.requestsText}</span>
            </span>
            <ArrowRight size={20} />
          </Link>
        )}

        {waiting.length > 0 && <FeedbackPrompt lessons={waiting} t={t} />}

        <section>
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t.upcoming}</h2>
            <Link href="/calendrier" className="text-sm font-semibold underline underline-offset-4">{t.calendar}</Link>
          </div>
          {upNext.length ? (
            <ul className="divide-y divide-sand-200 rounded-[1.75rem] border border-sand-200 bg-white">
              {upNext.slice(0, 5).map((l) => <UpNextRow key={l.id} lesson={l} t={t} />)}
            </ul>
          ) : (
            <EmptyState title={t.none}>{t.noneText}</EmptyState>
          )}
        </section>
      </div>
    </>
  );
}

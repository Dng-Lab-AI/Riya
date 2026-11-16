import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import { DomainMeters } from "@/components/charts";
import { Avatar } from "@/components/ui";
import { defineMessages, intlLocale, type Locale } from "@/i18n";
import { reportsAbout } from "@/lib/admin-ops";
import { getStudentTutorsForAdmin, getTutorStudentsForAdmin } from "@/lib/admin-progress";
import { timeAgo } from "@/lib/constants";
import type { ObjectId } from "@/lib/db";
import { getStudentProgress } from "@/lib/progress";
import { REPORT_REASON_LABELS } from "../../labels";

// Sections of a member's page on the admin site: a tutor's students, a student's progress.

const M = defineMessages({
  en: {
    students: (n: number) => `Students (${n})`, studentsLead: "Click a student to see their progress with this tutor in detail.",
    student: "Student", lessons: "Lessons", quiz: "Quizzes", words: "Words", review: "Review", sessions: "Sessions", last: "Last lesson",
    none: "No students yet.", noRating: "—", ratings: (n: number) => `${n} rating${n === 1 ? "" : "s"}`,
    progress: "Progress as a learner", hours: "Hours", wordsLearnt: "Words learnt", quizzes: "Quizzes passed", streak: "Streak",
    weeks: (n: number) => `${n} wk`, tutors: "Their tutors", lessonsWith: (n: number) => `${n} completed lesson${n === 1 ? "" : "s"}`,
  },
  fr: {
    students: (n: number) => `Élèves (${n})`, studentsLead: "Cliquez sur un élève pour voir sa progression avec ce tuteur en détail.",
    student: "Élève", lessons: "Cours", quiz: "Quiz", words: "Mots", review: "Avis", sessions: "Séances", last: "Dernier cours",
    none: "Aucun élève pour l'instant.", noRating: "—", ratings: (n: number) => `${n} note${n > 1 ? "s" : ""}`,
    progress: "Progression comme élève", hours: "Heures", wordsLearnt: "Mots appris", quizzes: "Quiz réussis", streak: "Série",
    weeks: (n: number) => `${n} sem.`, tutors: "Ses tuteurs", lessonsWith: (n: number) => `${n} cours terminé${n > 1 ? "s" : ""}`,
  },
});

const stars = (value: number | null, count: number, t: (typeof M)[Locale]) =>
  value === null ? <span className="text-earth-400">{t.noRating}</span> : (
    <span title={t.ratings(count)} className="inline-flex items-center gap-1 font-semibold"><Star size={13} className="fill-ochre-400 text-ochre-400" /> {value.toLocaleString()}</span>
  );

export async function TutorStudentsSection({ tutorId, locale }: { tutorId: ObjectId; locale: Locale }) {
  const t = M[locale];
  const students = await getTutorStudentsForAdmin(tutorId);
  const id = tutorId.toHexString();
  return (
    <section className="card p-5">
      <h2 className="font-display text-xl font-semibold">{t.students(students.length)}</h2>
      <p className="mb-3 text-sm text-earth-600">{t.studentsLead}</p>
      {students.length ? (
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-earth-500">
              <tr>
                <th className="px-2 py-2 font-semibold">{t.student}</th>
                <th className="px-2 py-2 text-right font-semibold">{t.lessons}</th>
                <th className="px-2 py-2 text-right font-semibold">{t.quiz}</th>
                <th className="px-2 py-2 text-right font-semibold">{t.words}</th>
                <th className="px-2 py-2 font-semibold">{t.review}</th>
                <th className="px-2 py-2 font-semibold">{t.sessions}</th>
                <th className="px-2 py-2 font-semibold">{t.last}</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-sand-50">
                  <td className="px-2 py-2.5">
                    <Link href={`/utilisateurs/${id}/eleves/${s.id}`} className="flex items-center gap-2 font-medium hover:text-clay-700">
                      <Avatar name={s.name} src={s.avatar_url} size={28} /> {s.name}
                    </Link>
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{s.completed}/{s.total}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{s.quiz_rate === null ? "—" : `${s.quiz_rate}%`}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{s.words}</td>
                  <td className="px-2 py-2.5">{stars(s.review, s.reviews, t)}</td>
                  <td className="px-2 py-2.5">{stars(s.feedback, s.feedbacks, t)}</td>
                  <td className="px-2 py-2.5 text-earth-500">{s.last_at ? timeAgo(s.last_at, locale) : "—"}</td>
                  <td className="px-2 py-2.5"><Link href={`/utilisateurs/${id}/eleves/${s.id}`} aria-label={s.name}><ChevronRight size={16} className="text-earth-400" /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-earth-600">{t.none}</p>
      )}
    </section>
  );
}

export async function StudentProgressSection({ studentId, locale }: { studentId: ObjectId; locale: Locale }) {
  const t = M[locale];
  const [p, tutors] = await Promise.all([getStudentProgress(studentId, locale), getStudentTutorsForAdmin(studentId)]);
  if (!tutors.length) return null;
  const id = studentId.toHexString();
  const tiles = [
    [t.hours, p.hours.toLocaleString(intlLocale(locale))],
    [t.wordsLearnt, String(p.words)],
    [t.quizzes, p.quiz.rate === null ? "—" : `${p.quiz.rate}%`],
    [t.streak, t.weeks(p.streakWeeks)],
  ];
  return (
    <section className="card space-y-4 p-5">
      <h2 className="font-display text-xl font-semibold">{t.progress}</h2>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-sand-50 p-3">
            <dt className="text-xs text-earth-500">{label}</dt>
            <dd className="text-xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <DomainMeters domains={p.domains} />
      <div>
        <h3 className="mb-2 font-semibold">{t.tutors}</h3>
        <ul className="divide-y divide-sand-200 text-sm">
          {tutors.map((tutor) => (
            <li key={tutor.id}>
              <Link href={`/utilisateurs/${tutor.id}/eleves/${id}`} className="flex items-center gap-3 py-2 hover:text-clay-700">
                <Avatar name={tutor.name} src={tutor.avatar_url} size={28} />
                <span className="flex-1 font-medium">{tutor.name}</span>
                <span className="text-earth-500">{t.lessonsWith(tutor.completed)}</span>
                <ChevronRight size={16} className="text-earth-400" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const R = defineMessages({
  en: { title: (n: number) => `Reports about this member (${n})`, by: "by", open: "to handle", handled: "handled", all: "All reports" },
  fr: { title: (n: number) => `Signalements concernant ce membre (${n})`, by: "par", open: "à traiter", handled: "traité", all: "Tous les signalements" },
});

// Reports other members made about this one (only shown when there are some).
export async function MemberReportsSection({ userId, locale }: { userId: ObjectId; locale: Locale }) {
  const reports = await reportsAbout(userId);
  if (!reports.length) return null;
  const t = R[locale];
  return (
    <section className="card space-y-3 border-clay-200 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-semibold text-clay-800">{t.title(reports.length)}</h2>
        <Link href="/signalements" className="text-sm font-semibold underline underline-offset-4">{t.all}</Link>
      </div>
      <ul className="space-y-3 text-sm">
        {reports.map((r) => (
          <li key={r.id}>
            <p className="font-semibold">
              {REPORT_REASON_LABELS[locale][r.reason]} <span className={`chip ml-1 ${r.status === "open" ? "bg-clay-100 text-clay-800" : "bg-forest-100 text-forest-800"}`}>{r.status === "open" ? t.open : t.handled}</span>
            </p>
            <p className="line-clamp-3 whitespace-pre-line text-earth-700">{r.details}</p>
            <p className="text-xs text-earth-500">{t.by} {r.reporter.name} · {timeAgo(r.created_at, locale)}{r.resolution && ` · ${r.resolution}`}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

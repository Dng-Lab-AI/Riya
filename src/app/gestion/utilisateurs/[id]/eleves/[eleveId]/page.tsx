import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import { AreaChart, ColumnChart, DomainMeters } from "@/components/charts";
import { Avatar } from "@/components/ui";
import { defineMessages, intlLocale } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { getPairDetail } from "@/lib/admin-progress";
import { requireAdmin } from "@/lib/auth";
import { timeAgo } from "@/lib/constants";

const M = defineMessages({
  en: {
    back: (name: string) => `Back to ${name}`, with: "with", lead: "Progress of this student in the lessons taken with this tutor.",
    hours: "Hours", lessons: (n: number) => `${n} completed lesson${n === 1 ? "" : "s"}`, words: "Words learnt", quizzes: "Quizzes passed",
    quizCaption: (c: number, n: number) => `${c} out of ${n}`, noQuiz: "no quizzes yet", review: "Review of the tutor", sessions: "Session ratings",
    none: "none yet", weekly: "Lessons per week", weeklyLabel: "Completed lessons per week", vocab: "Vocabulary", vocabLabel: "Words learnt over the lessons",
    ratings: "Session ratings, lesson after lesson", ratingsLabel: "Session rating (out of 5)", quizChart: "Quiz results, lesson after lesson", quizLabel: "Correct answers (%)",
    skills: "Skills", criteria: "What the student thinks of the lessons", criteriaNames: { clarity: "Clarity", interaction: "Interaction", content: "Content", pace: "Pace" } as Record<string, string>,
    reviews: "Public reviews", feedback: "Session feedback", liked: "Liked:", improve: "To improve:", noReviews: "No reviews yet.", noFeedback: "No session feedback yet.",
    history: "Lessons", keyPoints: "Key points:", homework: "Homework:", summary: "AI summary:", quiz: "Quiz", rating: "Rating",
    status: { pending: "Pending", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled" } as Record<string, string>,
    noData: "Not enough data yet.", latestWords: "Latest words",
  },
  fr: {
    back: (name: string) => `Retour à ${name}`, with: "avec", lead: "Progression de cet élève dans les cours suivis avec ce tuteur.",
    hours: "Heures", lessons: (n: number) => `${n} cours terminé${n > 1 ? "s" : ""}`, words: "Mots appris", quizzes: "Quiz réussis",
    quizCaption: (c: number, n: number) => `${c} sur ${n}`, noQuiz: "aucun quiz pour l'instant", review: "Avis sur le tuteur", sessions: "Notes des séances",
    none: "aucune pour l'instant", weekly: "Cours par semaine", weeklyLabel: "Cours terminés par semaine", vocab: "Vocabulaire", vocabLabel: "Mots appris au fil des cours",
    ratings: "Notes des séances, cours après cours", ratingsLabel: "Note de la séance (sur 5)", quizChart: "Résultats aux quiz, cours après cours", quizLabel: "Bonnes réponses (%)",
    skills: "Compétences", criteria: "Ce que l'élève pense des cours", criteriaNames: { clarity: "Clarté", interaction: "Interaction", content: "Contenu", pace: "Rythme" } as Record<string, string>,
    reviews: "Avis publics", feedback: "Retours de séance", liked: "A aimé :", improve: "À améliorer :", noReviews: "Pas encore d'avis.", noFeedback: "Pas encore de retour de séance.",
    history: "Cours", keyPoints: "Points clés :", homework: "Devoirs :", summary: "Résumé IA :", quiz: "Quiz", rating: "Note",
    status: { pending: "En attente", confirmed: "Confirmé", completed: "Terminé", cancelled: "Annulé" } as Record<string, string>,
    noData: "Pas encore assez de données.", latestWords: "Derniers mots",
  },
});

export const generateMetadata = () => titled({ en: "Student progress", fr: "Progression de l'élève" });

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="mb-4 font-display text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

const Stars = ({ value }: { value: number }) => (
  <span className="inline-flex items-center gap-1 font-semibold"><Star size={14} className="fill-ochre-400 text-ochre-400" /> {value}</span>
);

export default async function PairPage({ params }: PageProps<"/gestion/utilisateurs/[id]/eleves/[eleveId]">) {
  await requireAdmin();
  const { id, eleveId } = await params;
  const locale = await getLocale();
  const pair = await getPairDetail(id, eleveId, locale);
  if (!pair) notFound();
  const t = M[locale];
  const p = pair.progress;
  const date = (iso: string) => new Date(iso).toLocaleString(intlLocale(locale), { dateStyle: "medium", timeStyle: "short" });

  const tiles = [
    { label: t.hours, value: p.hours.toLocaleString(intlLocale(locale)), caption: t.lessons(p.lessons) },
    { label: t.words, value: String(p.words), caption: "" },
    { label: t.quizzes, value: p.quiz.rate === null ? "—" : `${p.quiz.rate}%`, caption: p.quiz.answered ? t.quizCaption(p.quiz.correct, p.quiz.answered) : t.noQuiz },
    { label: t.review, value: pair.review === null ? "—" : `${pair.review} / 5`, caption: pair.review === null ? t.none : "" },
    { label: t.sessions, value: pair.feedback === null ? "—" : `${pair.feedback} / 5`, caption: pair.feedback === null ? t.none : "" },
  ];

  return (
    <div className="space-y-6">
      <Link href={`/utilisateurs/${pair.tutor.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-earth-600 hover:text-clay-700"><ArrowLeft size={16} /> {t.back(pair.tutor.name)}</Link>

      <header className="card flex flex-wrap items-center gap-4 p-6">
        <Link href={`/utilisateurs/${pair.student.id}`} className="flex items-center gap-3 hover:text-clay-700">
          <Avatar name={pair.student.name} src={pair.student.avatar_url} size={56} />
          <span><span className="block font-display text-2xl font-semibold">{pair.student.name}</span><span className="text-sm text-earth-500">{pair.student.email}</span></span>
        </Link>
        <ArrowRight size={18} className="text-earth-400" aria-label={t.with} />
        <Link href={`/utilisateurs/${pair.tutor.id}`} className="flex items-center gap-3 hover:text-clay-700">
          <Avatar name={pair.tutor.name} src={pair.tutor.avatar_url} size={44} />
          <span className="font-semibold">{pair.tutor.name}</span>
        </Link>
        <p className="w-full text-sm text-earth-600">{t.lead}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {tiles.map((tile) => (
          <div key={tile.label} className="card p-4">
            <p className="text-xs text-earth-500">{tile.label}</p>
            <p className="text-2xl font-semibold">{tile.value}</p>
            {tile.caption && <p className="text-xs text-earth-500">{tile.caption}</p>}
          </div>
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Card title={t.weekly}><ColumnChart data={p.weekly} label={t.weeklyLabel} /></Card>
        <Card title={t.vocab}>
          {p.words ? <AreaChart data={p.vocabulary} label={t.vocabLabel} /> : <p className="text-sm text-earth-600">{t.noData}</p>}
          {p.recentWords.length > 0 && (
            <p className="mt-3 text-sm"><span className="font-semibold">{t.latestWords} :</span> {p.recentWords.join(", ")}</p>
          )}
        </Card>
        <Card title={t.ratings}>
          {pair.ratings.length ? <AreaChart data={pair.ratings} label={t.ratingsLabel} domain={[0, 5]} /> : <p className="text-sm text-earth-600">{t.noData}</p>}
        </Card>
        <Card title={t.quizChart}>
          {pair.quizzes.length ? <ColumnChart data={pair.quizzes} label={t.quizLabel} /> : <p className="text-sm text-earth-600">{t.noData}</p>}
        </Card>
        <Card title={t.skills}><DomainMeters domains={p.domains} /></Card>
        <Card title={t.criteria}>
          {pair.criteria.some((c) => c.value !== null) ? (
            <dl className="space-y-3">
              {pair.criteria.map((c) => (
                <div key={c.key}>
                  <div className="flex justify-between text-sm"><dt>{t.criteriaNames[c.key]}</dt><dd className="font-semibold">{c.value === null ? "—" : `${c.value} / 5`}</dd></div>
                  <div className="mt-1 h-2 rounded-full bg-sand-100"><div className="h-2 rounded-full bg-forest-600" style={{ width: `${((c.value ?? 0) / 5) * 100}%` }} /></div>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-earth-600">{t.noData}</p>
          )}
        </Card>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Card title={t.reviews}>
          {pair.reviews.length ? (
            <ul className="space-y-3 text-sm">
              {pair.reviews.map((r) => (
                <li key={r.id}>
                  <p className="flex items-center gap-2"><Stars value={r.rating} /> <span className="text-xs text-earth-500">{timeAgo(r.at, locale)}</span></p>
                  {r.comment && <p className="mt-1 text-earth-700">« {r.comment} »</p>}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-earth-600">{t.noReviews}</p>}
        </Card>
        <Card title={t.feedback}>
          {pair.feedbacks.length ? (
            <ul className="space-y-3 text-sm">
              {pair.feedbacks.map((f) => (
                <li key={f.id}>
                  <p className="flex items-center gap-2"><Stars value={f.rating} /> <span className="text-xs text-earth-500">{timeAgo(f.at, locale)}</span></p>
                  {f.liked && <p className="mt-1"><span className="font-semibold">{t.liked}</span> {f.liked}</p>}
                  {f.improve && <p><span className="font-semibold">{t.improve}</span> {f.improve}</p>}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-earth-600">{t.noFeedback}</p>}
        </Card>
      </div>

      <Card title={t.history}>
        <ul className="divide-y divide-sand-200 text-sm">
          {pair.lessons.map((l) => (
            <li key={l.id} className="space-y-1 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{date(l.starts_at)} · {l.language}</span>
                <span className="flex flex-wrap items-center gap-2">
                  {l.quiz && <span className="chip bg-sand-100 text-earth-700">{t.quiz} {l.quiz}</span>}
                  {l.rating !== null && <span className="chip bg-ochre-100 text-ochre-800">{t.rating} {l.rating}/5</span>}
                  <span className="chip bg-sand-100 text-earth-700">{t.status[l.status] ?? l.status}</span>
                </span>
              </div>
              {l.key_points && <p className="text-earth-700"><span className="font-semibold">{t.keyPoints}</span> {l.key_points}</p>}
              {l.homework && <p className="text-earth-700"><span className="font-semibold">{t.homework}</span> {l.homework}</p>}
              {l.summary && <p className="line-clamp-3 text-earth-600"><span className="font-semibold">{t.summary}</span> {l.summary}</p>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

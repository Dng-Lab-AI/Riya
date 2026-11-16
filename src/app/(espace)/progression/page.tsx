import Link from "next/link";
import { Info } from "lucide-react";
import { AreaChart, BarList, ColumnChart, DomainMeters } from "@/components/charts";
import { EmptyState, EspaceHeader } from "@/components/ui";
import { defineMessages, intlLocale, type Locale } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { getStudentProgress } from "@/lib/progress";

const s = (n: number) => (n > 1 ? "s" : "");

const M = defineMessages({
  en: {
    myProgress: "My progress", follow: "Follow your learning lesson after lesson.", startsTitle: "Your progress starts with your first lesson",
    startsText: "After each completed lesson, you'll see your learning hours, the words you've learnt, your quiz results and your regularity here.",
    book: "Book a lesson", bravo: (name: string) => `Well done ${name}, here's how far you've come since your first lesson.`,
    hours: "Learning hours", completed: (n: number) => `${n} completed lesson${s(n)}`, words: "Words learnt", wordsCaption: "noted by your tutors or the AI",
    quizzes: "Quizzes passed", quizCaption: (c: number, n: number) => `${c} out of ${n}`, noQuiz: "no quizzes yet",
    streak: "Current streak", weeks: (n: number) => `${n} week${s(n)}`, streakCaption: "with at least one lesson",
    weekly: "Your lessons, week after week", last12: "Completed lessons over the last 12 weeks", weeklyLabel: "Completed lessons per week",
    skills: "Your skills", skillsSub: "Where you stand in each area",
    skillsNote: "These are markers computed from your lessons, not grades. Hover over an area to see how it's measured.",
    vocab: "Your vocabulary is growing", vocabSub: "Total number of words learnt, after each lesson", vocabLabel: "Words learnt over the lessons",
    vocabEmpty: "Words will appear here as soon as your tutor notes them in class (“word = translation”) or your lessons' AI summary is ready.",
    latestWords: "Latest words", practised: "Languages practised", perLanguage: "Completed lessons per language",
    myActivity: "My activity", followTutor: "Follow your activity as a tutor.", statsTitle: "Your statistics arrive with your first lesson",
    statsText: "After your first completed lessons, you'll see your teaching hours, your earnings, your loyal students and how your ratings evolve here.",
    activityLead: "Your activity, your earnings and what your students think of your lessons.", taught: "Hours taught", students: "Students",
    loyal: (n: number) => `${n} loyal (2 lessons or more)`, avg: "Average rating", ratings: (n: number) => `${n} rating${s(n)}`,
    accepted: "Requests accepted", acceptedCaption: "out of the requests handled", given: "Lessons given", givenLabel: "Lessons given per week",
    earnings: "Net earnings", earningsSub: "Per month, after Riya's commission", earningsLabel: "Net earnings per month",
    satisfaction: "Student satisfaction", satisfactionSub: "Average rating per month (public reviews and session feedback)", satisfactionLabel: "Average rating per month",
    strengths: "Your strengths", strengthsSub: "Average of your students' private feedback", taughtLanguages: "Languages taught",
  },
  fr: {
    myProgress: "Ma progression", follow: "Suivez votre apprentissage cours après cours.", startsTitle: "Votre progression commence au premier cours",
    startsText: "Après chaque cours terminé, vous verrez ici vos heures d'apprentissage, les mots appris, vos résultats aux quiz et votre régularité.",
    book: "Réserver un cours", bravo: (name: string) => `Bravo ${name}, voici le chemin parcouru depuis votre premier cours.`,
    hours: "Heures d'apprentissage", completed: (n: number) => `${n} cours terminé${s(n)}`, words: "Mots appris", wordsCaption: "notés par vos tuteurs ou l'IA",
    quizzes: "Quiz réussis", quizCaption: (c: number, n: number) => `${c} sur ${n}`, noQuiz: "aucun quiz pour l'instant",
    streak: "Série en cours", weeks: (n: number) => `${n} semaine${s(n)}`, streakCaption: "avec au moins un cours",
    weekly: "Vos cours, semaine après semaine", last12: "Cours terminés sur les 12 dernières semaines", weeklyLabel: "Cours terminés par semaine",
    skills: "Vos compétences", skillsSub: "Où vous en êtes dans chaque domaine",
    skillsNote: "Ce sont des repères calculés à partir de vos cours, pas des notes. Passez la souris sur un domaine pour savoir comment il est mesuré.",
    vocab: "Votre vocabulaire grandit", vocabSub: "Nombre total de mots appris, après chaque cours", vocabLabel: "Mots appris au fil des cours",
    vocabEmpty: "Les mots apparaîtront ici dès que votre tuteur les notera en classe (« mot = traduction ») ou que le résumé IA de vos cours sera prêt.",
    latestWords: "Derniers mots", practised: "Langues pratiquées", perLanguage: "Nombre de cours terminés par langue",
    myActivity: "Mon évolution", followTutor: "Suivez votre activité de tuteur.", statsTitle: "Vos statistiques arrivent avec votre premier cours",
    statsText: "Après vos premiers cours terminés, vous verrez ici vos heures enseignées, vos revenus, vos élèves fidèles et l'évolution de vos notes.",
    activityLead: "Votre activité, vos revenus et ce que vos élèves pensent de vos cours.", taught: "Heures enseignées", students: "Élèves",
    loyal: (n: number) => `dont ${n} fidèle${s(n)} (2 cours ou plus)`, avg: "Note moyenne", ratings: (n: number) => `${n} note${s(n)}`,
    accepted: "Demandes acceptées", acceptedCaption: "parmi les demandes traitées", given: "Cours donnés", givenLabel: "Cours donnés par semaine",
    earnings: "Revenus nets", earningsSub: "Par mois, après la commission de Riya", earningsLabel: "Revenus nets par mois",
    satisfaction: "Satisfaction des élèves", satisfactionSub: "Note moyenne par mois (avis publics et retours de séance)", satisfactionLabel: "Note moyenne par mois",
    strengths: "Vos points forts", strengthsSub: "Moyenne des retours privés de vos élèves", taughtLanguages: "Langues enseignées",
  },
});

export async function generateMetadata() {
  return titled({ en: M.en.myProgress, fr: M.fr.myProgress });
}

function Stat({ label, value, caption, dark = false }: { label: string; value: string | number; caption?: string; dark?: boolean }) {
  return (
    <div className={`rounded-[1.5rem] p-5 ${dark ? "bg-forest-800 text-sand-50" : "border border-sand-200 bg-white"}`}>
      <p className={`text-sm ${dark ? "text-sand-200" : "text-earth-500"}`}>{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
      {caption && <p className={`mt-1 text-xs ${dark ? "text-sand-300" : "text-earth-500"}`}>{caption}</p>}
    </div>
  );
}

function Card({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[1.75rem] border border-sand-200 bg-white p-6 ${className}`}>
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-earth-500">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function ProgressPage() {
  const user = await requireUser("/progression");
  const locale = await getLocale();
  // Tutors follow their teaching on the Insights page; here, like students, the lessons they take with other tutors.
  return <StudentProgressView studentId={user._id} firstName={user.name.split(" ")[0]} locale={locale} />;
}

async function StudentProgressView({ studentId, firstName, locale }: { studentId: Parameters<typeof getStudentProgress>[0]; firstName: string; locale: Locale }) {
  const t = M[locale];
  const p = await getStudentProgress(studentId, locale);

  if (p.lessons === 0) {
    return (
      <>
        <EspaceHeader title={t.myProgress}>{t.follow}</EspaceHeader>
        <EmptyState title={t.startsTitle}>
          {t.startsText}
          <div className="mt-4"><Link href="/tuteurs" className="btn-primary">{t.book}</Link></div>
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <EspaceHeader title={t.myProgress}>{t.bravo(firstName)}</EspaceHeader>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat dark label={t.hours} value={p.hours.toLocaleString(intlLocale(locale))} caption={t.completed(p.lessons)} />
          <Stat label={t.words} value={p.words} caption={t.wordsCaption} />
          <Stat label={t.quizzes} value={p.quiz.rate === null ? "—" : `${p.quiz.rate}${locale === "fr" ? " " : ""}%`} caption={p.quiz.answered ? t.quizCaption(p.quiz.correct, p.quiz.answered) : t.noQuiz} />
          <Stat label={t.streak} value={t.weeks(p.streakWeeks)} caption={t.streakCaption} />
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[3fr_2fr]">
          <Card title={t.weekly} subtitle={t.last12}>
            <ColumnChart data={p.weekly} label={t.weeklyLabel} />
          </Card>
          <Card title={t.skills} subtitle={t.skillsSub}>
            <DomainMeters domains={p.domains} />
            <p className="mt-5 flex gap-2 rounded-2xl bg-sand-50 p-3 text-xs text-earth-600">
              <Info size={16} className="shrink-0 text-earth-400" />
              {t.skillsNote}
            </p>
          </Card>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[3fr_2fr]">
          <Card title={t.vocab} subtitle={t.vocabSub}>
            {p.words ? (
              <AreaChart data={p.vocabulary} label={t.vocabLabel} />
            ) : (
              <p className="text-sm text-earth-600">{t.vocabEmpty}</p>
            )}
            {p.recentWords.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-earth-500">{t.latestWords}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">{p.recentWords.map((w) => <span key={w} className="chip">{w}</span>)}</div>
              </div>
            )}
          </Card>
          <Card title={t.practised} subtitle={t.perLanguage}>
            <BarList data={p.languages} unit="cours" />
          </Card>
        </div>
      </div>
    </>
  );
}

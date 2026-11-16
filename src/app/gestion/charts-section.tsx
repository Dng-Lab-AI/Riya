import { AreaChart, BarList, ColumnChart } from "@/components/charts";
import { defineMessages, type Locale } from "@/i18n";
import { getAdminCharts } from "@/lib/admin-progress";

const M = defineMessages({
  en: {
    signups: "Sign-ups per week", signupsSub: "New members over the last 12 weeks", signupsLabel: "New members per week",
    tutorSignups: "New tutors per week", tutorSignupsLabel: "New tutors per week",
    lessons: "Lessons given per week", lessonsSub: "Completed lessons, last 12 weeks", lessonsLabel: "Completed lessons per week",
    volume: "Lesson volume per month", volumeSub: "Price of the completed lessons, last 6 months", volumeLabel: "Lesson volume per month",
    rating: "Average rating per month", ratingSub: "Public reviews and session feedback", ratingLabel: "Average rating per month",
    languages: "Most taught languages", tutors: "Most active tutors", top: "Completed lessons, last 6 months", empty: "Not enough data yet.",
  },
  fr: {
    signups: "Inscriptions par semaine", signupsSub: "Nouveaux membres sur les 12 dernières semaines", signupsLabel: "Nouveaux membres par semaine",
    tutorSignups: "Nouveaux tuteurs par semaine", tutorSignupsLabel: "Nouveaux tuteurs par semaine",
    lessons: "Cours donnés par semaine", lessonsSub: "Cours terminés, 12 dernières semaines", lessonsLabel: "Cours terminés par semaine",
    volume: "Volume des cours par mois", volumeSub: "Prix des cours terminés, 6 derniers mois", volumeLabel: "Volume des cours par mois",
    rating: "Note moyenne par mois", ratingSub: "Avis publics et retours de séance", ratingLabel: "Note moyenne par mois",
    languages: "Langues les plus enseignées", tutors: "Tuteurs les plus actifs", top: "Cours terminés, 6 derniers mois", empty: "Pas encore assez de données.",
  },
});

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-earth-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

// Charts of the admin dashboard: members, lessons, money and satisfaction over time.
export async function DashboardCharts({ locale }: { locale: Locale }) {
  const t = M[locale];
  const c = await getAdminCharts(locale);
  const empty = <p className="text-sm text-earth-600">{t.empty}</p>;
  return (
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <Card title={t.signups} subtitle={t.signupsSub}><ColumnChart data={c.signups} label={t.signupsLabel} /></Card>
      <Card title={t.lessons} subtitle={t.lessonsSub}><ColumnChart data={c.lessons} unit="cours" label={t.lessonsLabel} /></Card>
      <Card title={t.volume} subtitle={t.volumeSub}><AreaChart data={c.volume} unit="euro" label={t.volumeLabel} /></Card>
      <Card title={t.rating} subtitle={t.ratingSub}>
        {c.rating.some((p) => p.value !== null) ? <AreaChart data={c.rating} label={t.ratingLabel} domain={[0, 5]} /> : empty}
      </Card>
      <Card title={t.languages} subtitle={t.top}>{c.languages.length ? <BarList data={c.languages} unit="cours" /> : empty}</Card>
      <Card title={t.tutors} subtitle={t.top}>{c.tutors.length ? <BarList data={c.tutors} unit="cours" /> : empty}</Card>
      <Card title={t.tutorSignups} subtitle={t.signupsSub}><ColumnChart data={c.tutorSignups} label={t.tutorSignupsLabel} /></Card>
    </div>
  );
}

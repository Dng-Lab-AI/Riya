import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, Download, Info, Radio, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { AreaChart, DomainMeters } from "@/components/charts";
import { PeriodSelect } from "@/components/insights/PeriodSelect";
import { EspaceHeader } from "@/components/ui";
import { defineMessages, intlLocale, type Locale } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { first, formatPrice } from "@/lib/constants";
import { EARNINGS_PERIODS, PERIODS, getEarningsSeries, getTutorInsights, getTutorJourney, periodFrom, type Compared, type Goal } from "@/lib/insights";
import { commissionRate } from "@/lib/payments";
import { getTutorProgress } from "@/lib/progress";

const M = defineMessages({
  en: {
    title: "Insights", lead: "Your business at a glance, the habits that keep students coming back, and how visitors become regular students.",
    overview: "Overview", overviewLead: "Your activity over the period, compared with the period before.", period: "Period",
    earnings: "Earnings", earningsHint: "Net, after Riya's commission", lessons: "Lessons", lessonsHint: "Completed lessons",
    activeStudents: "Active students", activeHint: "Students with at least one completed lesson", newStudents: "New students", newHint: "First lesson with you",
    compared: (from: string, to: string, prev: string) => `Data from ${from} to ${to}, compared with ${prev} – ${from}.`,
    keys: "Keys to success", keysLead: "These markers help you grow your activity, attract new students and keep them engaged.",
    cancelled: "Lessons you cancelled", missed: "Lessons missed", missedHint: "Your student came to the classroom, you didn't",
    weekly: "Weekly lessons", weeklyHint: "Lessons that are part of a weekly series", replies: "Replies within 24 h", repliesHint: "Student messages answered within a day",
    followUps: "Trial follow-ups", followUpsHint: "Students who booked again after their first lesson", notes: "Lessons with notes", notesHint: "Key points, vocabulary or homework written",
    lessThan: (v: string) => `Aim for less than ${v}`, moreThan: (v: string) => `Aim for more than ${v}`, aimFor: (v: string) => `Aim for ${v}`,
    noData: "Not enough data yet", goalMet: "Goal reached", live: "Live", liveLead: "What students see on your profile today.",
    bookable: "Bookable hours", bookableHint: "Free hours in the next 7 days", rating: "Average rating", ratingHint: (n: number) => `${n} review${n === 1 ? "" : "s"}`,
    profileScore: "Profile score", missing: (items: string) => `Missing: ${items}`, complete: "Complete profile", price: "Price per lesson", priceHint: "50-minute lesson",
    edit: "Edit", funnel: "New regular students", funnelLead: "How many visitors take the next step after seeing your profile or taking a trial lesson.",
    views: "Profile views", trials: "Trial lessons", subscriptions: "Regular students", subscriptionsHint: "2 lessons or more",
    position: "Average position in search", positionOf: (n: number) => `out of ${n} tutors`, notListed: "Not listed yet",
    takeTrial: "Book a trial lesson", takeTrialHint: "Profile views → trial lessons", stay: "Stay after the trial", stayHint: "Trial lessons → regular students",
    viewsNote: "Profile views have been counted since this page was added.",
    earningsTitle: "Earnings", download: "Download (CSV)", current: "Current", estimated: "Estimated", income: "Net income earned",
    incomeEstimated: "Net income, including confirmed lessons not closed yet", chartLabel: "Net earnings",
    journey: "Your Riya journey", journeyLead: (since: string) => `What you've accomplished since you joined in ${since}.`,
    taught: "Lessons taught", hours: "Hours of teaching", students: "Students", reviews: "Reviews received",
    satisfaction: "Student satisfaction", satisfactionLead: "Average rating per month (public reviews and session feedback)",
    strengths: "Your strengths", strengthsLead: "Average of your students' private feedback", seeEarnings: "See the detail of your earnings",
  },
  fr: {
    title: "Statistiques", lead: "Votre activité en un coup d'œil, les habitudes qui font revenir les élèves, et comment les visiteurs deviennent des élèves réguliers.",
    overview: "Vue d'ensemble", overviewLead: "Votre activité sur la période, comparée à la période précédente.", period: "Période",
    earnings: "Revenus", earningsHint: "Nets, après la commission de Riya", lessons: "Cours", lessonsHint: "Cours terminés",
    activeStudents: "Élèves actifs", activeHint: "Élèves avec au moins un cours terminé", newStudents: "Nouveaux élèves", newHint: "Premier cours avec vous",
    compared: (from: string, to: string, prev: string) => `Données du ${from} au ${to}, comparées au ${prev} – ${from}.`,
    keys: "Clés du succès", keysLead: "Ces repères vous aident à développer votre activité, attirer de nouveaux élèves et les garder motivés.",
    cancelled: "Cours que vous avez annulés", missed: "Cours manqués", missedHint: "Votre élève est venu en classe, pas vous",
    weekly: "Cours hebdomadaires", weeklyHint: "Cours faisant partie d'une série hebdomadaire", replies: "Réponses sous 24 h", repliesHint: "Messages d'élèves auxquels vous avez répondu dans la journée",
    followUps: "Suivi après le cours d'essai", followUpsHint: "Élèves qui ont réservé à nouveau après leur premier cours", notes: "Cours avec notes", notesHint: "Points clés, vocabulaire ou devoirs rédigés",
    lessThan: (v: string) => `Objectif : moins de ${v}`, moreThan: (v: string) => `Objectif : plus de ${v}`, aimFor: (v: string) => `Objectif : ${v}`,
    noData: "Pas encore assez de données", goalMet: "Objectif atteint", live: "En direct", liveLead: "Ce que les élèves voient aujourd'hui sur votre profil.",
    bookable: "Heures réservables", bookableHint: "Heures libres dans les 7 prochains jours", rating: "Note moyenne", ratingHint: (n: number) => `${n} avis`,
    profileScore: "Score du profil", missing: (items: string) => `À compléter : ${items}`, complete: "Profil complet", price: "Prix du cours", priceHint: "Cours de 50 minutes",
    edit: "Modifier", funnel: "Nouveaux élèves réguliers", funnelLead: "Combien de visiteurs passent à l'étape suivante après avoir vu votre profil ou suivi un cours d'essai.",
    views: "Vues du profil", trials: "Cours d'essai", subscriptions: "Élèves réguliers", subscriptionsHint: "2 cours ou plus",
    position: "Position moyenne dans la recherche", positionOf: (n: number) => `sur ${n} tuteurs`, notListed: "Pas encore visible",
    takeTrial: "Réserver un cours d'essai", takeTrialHint: "Vues du profil → cours d'essai", stay: "Rester après l'essai", stayHint: "Cours d'essai → élèves réguliers",
    viewsNote: "Les vues du profil sont comptées depuis l'ajout de cette page.",
    earningsTitle: "Revenus", download: "Télécharger (CSV)", current: "Actuels", estimated: "Estimés", income: "Revenus nets gagnés",
    incomeEstimated: "Revenus nets, cours confirmés pas encore clôturés compris", chartLabel: "Revenus nets",
    journey: "Votre parcours sur Riya", journeyLead: (since: string) => `Ce que vous avez accompli depuis votre arrivée en ${since}.`,
    taught: "Cours donnés", hours: "Heures d'enseignement", students: "Élèves", reviews: "Avis reçus",
    satisfaction: "Satisfaction des élèves", satisfactionLead: "Note moyenne par mois (avis publics et retours de séance)",
    strengths: "Vos points forts", strengthsLead: "Moyenne des retours privés de vos élèves", seeEarnings: "Voir le détail de vos revenus",
  },
});

type Texts = (typeof M)["en"];

export const generateMetadata = () => titled({ en: M.en.title, fr: M.fr.title });

const percent = (value: number, locale: Locale) => `${value.toLocaleString(intlLocale(locale), { maximumFractionDigits: 1 })}${locale === "fr" ? " " : ""}%`;

function Change({ value, previous, locale }: Compared & { locale: Locale }) {
  if (!previous) return null;
  const change = Math.round(((value - previous) / previous) * 100);
  if (change === 0) return <span className="text-sm text-earth-500">=</span>;
  const up = change > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${up ? "text-forest-700" : "text-clay-700"}`}>
      <Icon size={16} /> {percent(Math.abs(change), locale)}
    </span>
  );
}

function OverviewCard({ label, hint, display, compared, locale }: { label: string; hint: string; display: string; compared: Compared; locale: Locale }) {
  return (
    <div className="flex flex-col justify-between rounded-[1.25rem] bg-white p-4" title={hint}>
      <p className="text-sm text-earth-600">{label}</p>
      <div className="mt-4">
        <p className="font-display text-3xl font-semibold">{display}</p>
        <Change {...compared} locale={locale} />
      </div>
    </div>
  );
}

const met = (goal: Goal) => goal.value !== null && (goal.better === "lower" ? goal.value <= goal.target : goal.value >= goal.target);

function GoalCard({ title, hint, goal, unit, t, locale, children }: { title: string; hint?: string; goal: Goal; unit: "%" | "number" | "rating" | "hours"; t: Texts; locale: Locale; children?: React.ReactNode }) {
  const show = (v: number) => (unit === "%" ? percent(v, locale) : v.toLocaleString(intlLocale(locale), { maximumFractionDigits: 1 }));
  const aim = goal.better === "lower" ? (goal.target === 0 ? t.aimFor(show(0)) : t.lessThan(show(goal.target))) : t.moreThan(show(goal.target));
  return (
    <div className="flex min-h-40 flex-col rounded-[1.5rem] border border-sand-200 bg-white p-5">
      <p className="font-semibold">{title}</p>
      <p className="text-xs text-earth-500">{aim}</p>
      {hint && <p className="mt-1 text-xs text-earth-400">{hint}</p>}
      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        {goal.value === null ? <p className="text-sm text-earth-500">{t.noData}</p> : <p className="font-display text-4xl font-semibold">{show(goal.value)}</p>}
        {met(goal) && <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-100 text-forest-700" title={t.goalMet}><Check size={17} /></span>}
      </div>
      {children}
    </div>
  );
}

function SectionTitle({ title, lead, action }: { title: string; lead: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h2>
        <p className="mt-1 text-earth-600">{lead}</p>
      </div>
      {action}
    </div>
  );
}

export default async function InsightsPage({ searchParams }: PageProps<"/statistiques">) {
  const user = await requireUser("/statistiques");
  if (user.role !== "tutor") redirect("/progression");

  const sp = await searchParams;
  const period = periodFrom(first(sp.periode), PERIODS, 90) as (typeof PERIODS)[number];
  const earningsDays = periodFrom(first(sp.revenus), EARNINGS_PERIODS, 30) as (typeof EARNINGS_PERIODS)[number];
  const estimated = first(sp.vue) === "estime";
  const locale = await getLocale();
  const t = M[locale];
  const lang = intlLocale(locale);

  const [insights, earnings, journey, progress] = await Promise.all([
    getTutorInsights(user._id, period, locale),
    getEarningsSeries(user._id, earningsDays, estimated, locale),
    getTutorJourney(user._id),
    getTutorProgress(user._id, commissionRate(), locale),
  ]);
  const { overview, keys, live, funnel, range } = insights;
  const day = (iso: string) => new Date(iso).toLocaleDateString(lang, { day: "numeric", month: "long" });
  const rate = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : null);
  const viewToTrial = rate(funnel.trials.value, funnel.views.value);
  const trialToSub = rate(funnel.subscriptions.value, funnel.trials.value);
  const funnelMax = Math.max(funnel.views.value, funnel.trials.value, funnel.subscriptions.value, 1);
  const query = (changes: Record<string, string>) => `?${new URLSearchParams({ periode: String(period), revenus: String(earningsDays), ...(estimated ? { vue: "estime" } : {}), ...changes })}`;

  return (
    <>
      <EspaceHeader title={t.title}>{t.lead}</EspaceHeader>
      <div className="space-y-12">
        {/* Overview */}
        <section className="rounded-[1.75rem] bg-forest-100 p-5 sm:p-7">
          <div className="grid gap-5 lg:grid-cols-[14rem_1fr]">
            <div className="flex flex-col justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-semibold">{t.overview}</h2>
                <p className="mt-1 text-forest-800">{t.overviewLead}</p>
              </div>
              <PeriodSelect name="periode" value={period} options={PERIODS} label={t.period} />
            </div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <OverviewCard label={t.earnings} hint={t.earningsHint} display={formatPrice(overview.earnings.value, locale)} compared={overview.earnings} locale={locale} />
              <OverviewCard label={t.lessons} hint={t.lessonsHint} display={String(overview.lessons.value)} compared={overview.lessons} locale={locale} />
              <OverviewCard label={t.activeStudents} hint={t.activeHint} display={String(overview.activeStudents.value)} compared={overview.activeStudents} locale={locale} />
              <OverviewCard label={t.newStudents} hint={t.newHint} display={String(overview.newStudents.value)} compared={overview.newStudents} locale={locale} />
            </div>
          </div>
          <p className="mt-4 text-right text-xs text-forest-800">{t.compared(day(range.from), day(range.to), day(range.previousFrom))}</p>
        </section>

        {/* Keys to success */}
        <section>
          <SectionTitle title={t.keys} lead={t.keysLead} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <GoalCard title={t.cancelled} goal={keys.cancelled} unit="%" t={t} locale={locale} />
            <GoalCard title={t.missed} hint={t.missedHint} goal={keys.missed} unit="number" t={t} locale={locale} />
            <GoalCard title={t.weekly} hint={t.weeklyHint} goal={keys.weekly} unit="%" t={t} locale={locale} />
            <GoalCard title={t.replies} hint={t.repliesHint} goal={keys.replies} unit="%" t={t} locale={locale} />
            <GoalCard title={t.followUps} hint={t.followUpsHint} goal={keys.followUps} unit="%" t={t} locale={locale} />
            <GoalCard title={t.notes} hint={t.notesHint} goal={keys.notes} unit="%" t={t} locale={locale} />
          </div>
        </section>

        {/* Live */}
        <section>
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-900"><Radio size={14} /> {t.live}</p>
          <p className="mb-4 text-earth-600">{t.liveLead}</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <GoalCard title={t.bookable} hint={t.bookableHint} goal={live.bookableHours} unit="hours" t={t} locale={locale}>
              <Link href="/calendrier" className="mt-2 text-xs font-semibold text-clay-700 underline">{t.edit}</Link>
            </GoalCard>
            <GoalCard title={t.rating} hint={t.ratingHint(live.rating.count)} goal={live.rating} unit="rating" t={t} locale={locale} />
            <GoalCard title={t.profileScore} hint={live.profileScore.missing.length ? t.missing(live.profileScore.missing.join(", ")) : t.complete} goal={live.profileScore} unit="%" t={t} locale={locale}>
              <Link href="/profil/tuteur" className="mt-2 text-xs font-semibold text-clay-700 underline">{t.edit}</Link>
            </GoalCard>
            <div className="flex min-h-40 flex-col rounded-[1.5rem] border border-sand-200 bg-white p-5">
              <p className="font-semibold">{t.price}</p>
              <p className="text-xs text-earth-500">{t.priceHint}</p>
              <p className="mt-auto pt-4 font-display text-4xl font-semibold">{formatPrice(live.price, locale)}</p>
              <Link href="/profil/tuteur" className="mt-2 text-xs font-semibold text-clay-700 underline">{t.edit}</Link>
            </div>
          </div>
        </section>

        {/* Funnel */}
        <section>
          <SectionTitle title={t.funnel} lead={t.funnelLead} action={<PeriodSelect name="periode" value={period} options={PERIODS} label={t.period} />} />
          <div className="grid gap-3 lg:grid-cols-[1fr_20rem]">
            <div className="grid grid-cols-3 overflow-hidden rounded-[1.5rem] border border-sand-200 bg-white">
              {([
                [t.views, funnel.views, "bg-sky-300", null],
                [t.trials, funnel.trials, "bg-sky-600", null],
                [t.subscriptions, funnel.subscriptions, "bg-sky-900", t.subscriptionsHint],
              ] as const).map(([label, value, color, hint], i) => (
                <div key={label} className={`flex min-h-64 flex-col ${i ? "border-l border-dashed border-sand-300" : ""}`}>
                  <div className="p-4">
                    <p className="text-sm text-earth-600">{label}</p>
                    <p className="font-display text-3xl font-semibold">{value.value}</p>
                    <Change {...value} locale={locale} />
                    {hint && <p className="text-xs text-earth-400">{hint}</p>}
                  </div>
                  {/* Square root scale, so the small steps of the funnel stay visible. */}
                  <div className={`mt-auto ${color}`} style={{ height: `${Math.max(6, Math.sqrt(value.value / funnelMax) * 100) * 0.9}px` }} />
                </div>
              ))}
            </div>
            <div className="grid gap-3">
              <div className="rounded-[1.5rem] border border-sand-200 bg-white p-5">
                <p className="font-semibold">{t.position}</p>
                <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-900"><Radio size={12} /> {t.live}</p>
                <p className="mt-2 font-display text-3xl font-semibold">{funnel.position ?? "—"}</p>
                <p className="text-xs text-earth-500">{funnel.position ? t.positionOf(funnel.tutorCount) : t.notListed}</p>
              </div>
              <GoalCard title={t.takeTrial} hint={t.takeTrialHint} goal={{ value: viewToTrial, target: 2, better: "higher" }} unit="%" t={t} locale={locale} />
              <GoalCard title={t.stay} hint={t.stayHint} goal={{ value: trialToSub, target: 60, better: "higher" }} unit="%" t={t} locale={locale} />
            </div>
          </div>
          <p className="mt-3 flex items-center justify-end gap-1.5 text-xs text-earth-500"><Info size={13} /> {t.viewsNote}</p>
        </section>

        {/* Earnings */}
        <section>
          <SectionTitle
            title={t.earningsTitle}
            lead=""
            action={
              <div className="flex flex-wrap items-center gap-2">
                <a href={`/api/statistiques/revenus?jours=${earningsDays}`} className="btn-outline px-3" title={t.download} aria-label={t.download}><Download size={17} /></a>
                <PeriodSelect name="revenus" value={earningsDays} options={EARNINGS_PERIODS} label={t.period} />
              </div>
            }
          />
          <div className="rounded-[1.5rem] border border-sand-200 bg-white p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Wallet size={26} />
                <div>
                  <p className="font-display text-3xl font-semibold">{formatPrice(earnings.total, locale)}</p>
                  <p className="text-sm text-earth-600">{estimated ? t.incomeEstimated : t.income}</p>
                </div>
              </div>
              <div className="flex rounded-full bg-sand-100 p-1 text-sm font-medium">
                <Link href={query({ vue: "" })} scroll={false} className={`rounded-full px-4 py-1.5 ${!estimated ? "bg-white shadow-sm" : "text-earth-600"}`}>{t.current}</Link>
                <Link href={query({ vue: "estime" })} scroll={false} className={`rounded-full px-4 py-1.5 ${estimated ? "bg-white shadow-sm" : "text-earth-600"}`}>{t.estimated}</Link>
              </div>
            </div>
            <AreaChart data={earnings.points} unit="euro" label={t.chartLabel} />
            <Link href="/profil/paiements" className="mt-3 inline-block text-sm font-semibold text-clay-700 underline">{t.seeEarnings}</Link>
          </div>
        </section>

        {/* Journey */}
        <section>
          <SectionTitle title={t.journey} lead={t.journeyLead(new Date(journey.since).toLocaleDateString(lang, { month: "long", year: "numeric" }))} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {([
              [t.taught, journey.lessons.toLocaleString(lang)],
              [t.hours, journey.hours.toLocaleString(lang)],
              [t.students, journey.students.toLocaleString(lang)],
              [t.reviews, journey.reviews.toLocaleString(lang)],
            ] as const).map(([label, value], i) => (
              <div key={label} className={`rounded-[1.5rem] p-5 ${i === 0 ? "bg-forest-800 text-sand-50" : "border border-sand-200 bg-white"}`}>
                <p className={`text-sm ${i === 0 ? "text-sand-200" : "text-earth-500"}`}>{label}</p>
                <p className="mt-1 font-display text-3xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          {progress.lessons > 0 && (
            <div className="mt-3 grid items-start gap-3 xl:grid-cols-[3fr_2fr]">
              <div className="rounded-[1.5rem] border border-sand-200 bg-white p-5">
                <h3 className="font-semibold">{t.satisfaction}</h3>
                <p className="mb-4 text-sm text-earth-500">{t.satisfactionLead}</p>
                <AreaChart data={progress.ratings} domain={[0, 5]} label={t.satisfaction} />
              </div>
              <div className="rounded-[1.5rem] border border-sand-200 bg-white p-5">
                <h3 className="font-semibold">{t.strengths}</h3>
                <p className="mb-4 text-sm text-earth-500">{t.strengthsLead}</p>
                <DomainMeters domains={progress.criteria} />
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

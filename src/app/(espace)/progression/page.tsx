import type { Metadata } from "next";
import Link from "next/link";
import { Info } from "lucide-react";
import { AreaChart, BarList, ColumnChart, DomainMeters } from "@/components/charts";
import { EmptyState, EspaceHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { commissionRate } from "@/lib/payments";
import { getStudentProgress, getTutorProgress } from "@/lib/progress";

export const metadata: Metadata = { title: "Ma progression" };

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

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

export default async function ProgressPage() {
  const user = await requireUser("/progression");
  return user.role === "tutor" ? <TutorProgressView tutorId={user._id} /> : <StudentProgressView studentId={user._id} firstName={user.name.split(" ")[0]} />;
}

async function StudentProgressView({ studentId, firstName }: { studentId: Parameters<typeof getStudentProgress>[0]; firstName: string }) {
  const p = await getStudentProgress(studentId);

  if (p.lessons === 0) {
    return (
      <>
        <EspaceHeader title="Ma progression">Suivez votre apprentissage cours après cours.</EspaceHeader>
        <EmptyState title="Votre progression commence au premier cours">
          Après chaque cours terminé, vous verrez ici vos heures d&apos;apprentissage, les mots appris, vos résultats aux quiz et votre régularité.
          <div className="mt-4"><Link href="/tuteurs" className="btn-primary">Réserver un cours</Link></div>
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <EspaceHeader title="Ma progression">Bravo {firstName}, voici le chemin parcouru depuis votre premier cours.</EspaceHeader>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat dark label="Heures d'apprentissage" value={p.hours.toLocaleString("fr-FR")} caption={plural(p.lessons, "cours terminé")} />
          <Stat label="Mots appris" value={p.words} caption="notés par vos tuteurs ou l'IA" />
          <Stat label="Quiz réussis" value={p.quiz.rate === null ? "—" : `${p.quiz.rate} %`} caption={p.quiz.answered ? `${p.quiz.correct} sur ${p.quiz.answered}` : "aucun quiz pour l'instant"} />
          <Stat label="Série en cours" value={plural(p.streakWeeks, "semaine")} caption="avec au moins un cours" />
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[3fr_2fr]">
          <Card title="Vos cours, semaine après semaine" subtitle="Cours terminés sur les 12 dernières semaines">
            <ColumnChart data={p.weekly} label="Cours terminés par semaine" />
          </Card>
          <Card title="Vos compétences" subtitle="Où vous en êtes dans chaque domaine">
            <DomainMeters domains={p.domains} />
            <p className="mt-5 flex gap-2 rounded-2xl bg-sand-50 p-3 text-xs text-earth-600">
              <Info size={16} className="shrink-0 text-earth-400" />
              Ce sont des repères calculés à partir de vos cours, pas des notes. Passez la souris sur un domaine pour savoir comment il est mesuré.
            </p>
          </Card>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[3fr_2fr]">
          <Card title="Votre vocabulaire grandit" subtitle="Nombre total de mots appris, après chaque cours">
            {p.words ? (
              <AreaChart data={p.vocabulary} label="Mots appris au fil des cours" />
            ) : (
              <p className="text-sm text-earth-600">Les mots apparaîtront ici dès que votre tuteur les notera en classe (« mot = traduction ») ou que le résumé IA de vos cours sera prêt.</p>
            )}
            {p.recentWords.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-earth-500">Derniers mots</p>
                <div className="mt-2 flex flex-wrap gap-1.5">{p.recentWords.map((w) => <span key={w} className="chip">{w}</span>)}</div>
              </div>
            )}
          </Card>
          <Card title="Langues pratiquées" subtitle="Nombre de cours terminés par langue">
            <BarList data={p.languages} unit="cours" />
          </Card>
        </div>
      </div>
    </>
  );
}

async function TutorProgressView({ tutorId }: { tutorId: Parameters<typeof getTutorProgress>[0] }) {
  const p = await getTutorProgress(tutorId, commissionRate());

  if (p.lessons === 0) {
    return (
      <>
        <EspaceHeader title="Mon évolution">Suivez votre activité de tuteur.</EspaceHeader>
        <EmptyState title="Vos statistiques arrivent avec votre premier cours">
          Après vos premiers cours terminés, vous verrez ici vos heures enseignées, vos revenus, vos élèves fidèles et l&apos;évolution de vos notes.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <EspaceHeader title="Mon évolution">Votre activité, vos revenus et ce que vos élèves pensent de vos cours.</EspaceHeader>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat dark label="Heures enseignées" value={p.hours.toLocaleString("fr-FR")} caption={plural(p.lessons, "cours terminé")} />
          <Stat label="Élèves" value={p.students} caption={`dont ${plural(p.returning, "fidèle")} (2 cours ou plus)`} />
          <Stat label="Note moyenne" value={p.rating === null ? "—" : `${p.rating.toLocaleString("fr-FR")} / 5`} caption={plural(p.ratingCount, "note")} />
          <Stat label="Demandes acceptées" value={p.acceptance === null ? "—" : `${p.acceptance} %`} caption="parmi les demandes traitées" />
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-2">
          <Card title="Cours donnés" subtitle="Cours terminés sur les 12 dernières semaines">
            <ColumnChart data={p.weekly} label="Cours donnés par semaine" />
          </Card>
          <Card title="Revenus nets" subtitle="Par mois, après la commission de Riya">
            <ColumnChart data={p.earnings} unit="euro" label="Revenus nets par mois" />
          </Card>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[3fr_2fr]">
          <Card title="Satisfaction des élèves" subtitle="Note moyenne par mois (avis publics et retours de séance)">
            <AreaChart data={p.ratings} domain={[0, 5]} label="Note moyenne par mois" />
          </Card>
          <Card title="Vos points forts" subtitle="Moyenne des retours privés de vos élèves">
            <DomainMeters domains={p.criteria} />
          </Card>
        </div>

        <Card title="Langues enseignées" subtitle="Nombre de cours terminés par langue">
          <BarList data={p.languages} unit="cours" />
        </Card>
      </div>
    </>
  );
}

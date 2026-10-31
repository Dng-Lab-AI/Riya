import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CircleCheck, NotebookText, Star, Video, Wallet } from "lucide-react";
import { TutorTile } from "@/components/cards";
import { LocalDateTime, SubmitButton } from "@/components/client";
import { ReviewForm } from "@/components/ReviewForm";
import { Avatar, EmptyState, EspaceHeader, Stars } from "@/components/ui";
import { payLesson, updateLesson } from "@/lib/actions/lessons";
import { requireUser } from "@/lib/auth";
import { LESSON_STATUS, first, formatPrice } from "@/lib/constants";
import { FREE_CANCELLATION_HOURS, commissionRate } from "@/lib/payments";
import { getFavoriteTutors, getStudentLessons, getTutor, getTutorFeedbackOverview, getTutorLessons, type Lesson, type TutorFeedbackOverview } from "@/lib/queries";

export const metadata: Metadata = { title: "Mes cours" };

const hasStarted = (l: Lesson) => new Date(l.starts_at).getTime() <= Date.now();
const isUpcoming = (l: Lesson) => ["pending", "confirmed"].includes(l.status) && !hasStarted(l);
const byDateAsc = (a: Lesson, b: Lesson) => a.starts_at.localeCompare(b.starts_at);
// Confirmed lessons stay joinable until 30 minutes after their end.
const PAYMENT_LABELS: Record<NonNullable<Lesson["payment"]>["status"], { label: string; className: string }> = {
  paid: { label: "Payé", className: "bg-forest-100 text-forest-800" },
  pending: { label: "Paiement en attente", className: "bg-ochre-100 text-ochre-800" },
  failed: { label: "Paiement non abouti", className: "bg-clay-100 text-clay-800" },
  refunded: { label: "Remboursé", className: "bg-sand-200 text-earth-800" },
  refund_failed: { label: "Remboursement en cours", className: "bg-ochre-100 text-ochre-800" },
};

const upcomingOrLive = (l: Lesson) => new Date(l.starts_at).getTime() + (l.duration_minutes + 30) * 60 * 1000 > Date.now();

function LessonRow({ lesson, as }: { lesson: Lesson; as: "student" | "tutor" }) {
  const status = LESSON_STATUS[lesson.status];
  const upcoming = !hasStarted(lesson);
  const action = (name: Parameters<typeof updateLesson>[1]) => updateLesson.bind(null, lesson.id, name);

  return (
    <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <Avatar name={lesson.other_name} src={lesson.other_avatar} size={48} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {as === "student" ? (
            <Link href={`/tuteurs/${lesson.other_id}`} className="font-semibold hover:text-clay-700">{lesson.other_name}</Link>
          ) : (
            <span className="font-semibold">{lesson.other_name}</span>
          )}
          <span className={`chip ${status.className}`}>{status.label}</span>
          {as === "student" && lesson.payment && (
            <span className={`chip ${PAYMENT_LABELS[lesson.payment.status].className}`}>{PAYMENT_LABELS[lesson.payment.status].label} · {lesson.payment.amount_label}</span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-earth-600">
          {lesson.language_name} · <LocalDateTime iso={lesson.starts_at} /> · {lesson.duration_minutes} min · {formatPrice(lesson.price)}
        </p>
        {lesson.message && <p className="mt-1 text-sm italic text-earth-500">« {lesson.message} »</p>}
        {lesson.review_rating && <p className="mt-1 flex items-center gap-2 text-sm text-earth-500">Votre avis : <Stars value={lesson.review_rating} /></p>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {as === "student" && lesson.status === "pending" && upcoming && (lesson.payment?.status === "pending" || lesson.payment?.status === "failed") && (
          <form action={payLesson.bind(null, lesson.id)}><SubmitButton className="btn-primary"><Wallet size={16} /> Payer</SubmitButton></form>
        )}
        {lesson.status === "confirmed" && upcomingOrLive(lesson) && (
          <Link href={`/classe/${lesson.id}`} className="btn-dark"><Video size={16} /> Salle de classe</Link>
        )}
        {as === "tutor" && lesson.status === "pending" && (
          <>
            <form action={action("confirm")}><SubmitButton className="btn-primary">Accepter</SubmitButton></form>
            <form action={action("decline")}><SubmitButton className="btn-outline">Refuser</SubmitButton></form>
          </>
        )}
        {as === "tutor" && lesson.status === "confirmed" && !upcoming && (
          <form action={action("complete")}><SubmitButton className="btn-primary"><CircleCheck size={16} /> Marquer terminé</SubmitButton></form>
        )}
        {upcoming && ["pending", "confirmed"].includes(lesson.status) && !(as === "tutor" && lesson.status === "pending") && (
          <form action={action("cancel")}><SubmitButton className="btn-ghost text-clay-700">Annuler</SubmitButton></form>
        )}
        {as === "student" && lesson.status === "completed" && !lesson.review_rating && <ReviewForm lessonId={lesson.id} />}
        {["confirmed", "completed"].includes(lesson.status) && (
          <Link href={`/cours/${lesson.id}`} className="btn-ghost"><NotebookText size={16} /> Résumé</Link>
        )}
        <Link href={`/messages/${lesson.other_id}`} className="btn-ghost">Message</Link>
      </div>
    </div>
  );
}

function LessonList({ title, lessons, as, empty }: { title: string; lessons: Lesson[]; as: "student" | "tutor"; empty: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 font-display text-2xl font-semibold">{title}</h2>
      <div className="space-y-3">{lessons.length ? lessons.map((l) => <LessonRow key={l.id} lesson={l} as={as} />) : empty}</div>
    </section>
  );
}

const CRITERIA_LABELS = { clarity: "Clarté", interaction: "Interaction", content: "Contenu", pace: "Rythme" } as const;

// Private session ratings from students, to help the tutor improve.
function FeedbackSection({ overview }: { overview: TutorFeedbackOverview }) {
  return (
    <section>
      <h2 className="mb-1 font-display text-2xl font-semibold">Retours de vos élèves</h2>
      <p className="mb-4 text-sm text-earth-600">Notes privées laissées après chaque séance : elles ne s&apos;affichent pas sur votre profil public.</p>
      {overview.averages ? (
        <div className="space-y-4">
          <div className="card grid gap-4 p-5 sm:grid-cols-5">
            <div>
              <p className="text-sm text-earth-500">Moyenne ({overview.count} séance{overview.count > 1 ? "s" : ""})</p>
              <p className="font-display text-3xl font-semibold">{overview.averages.rating.toFixed(1)}</p>
            </div>
            {(Object.keys(CRITERIA_LABELS) as (keyof typeof CRITERIA_LABELS)[]).map((key) => (
              <div key={key}>
                <p className="text-sm text-earth-500">{CRITERIA_LABELS[key]}</p>
                <p className="text-lg font-semibold">{overview.averages![key].toFixed(1)} <span className="text-sm font-normal text-earth-500">/ 5</span></p>
              </div>
            ))}
          </div>
          <ul className="space-y-3">
            {overview.recent.filter((f) => f.liked || f.improve).map((f) => (
              <li key={f.lesson_id} className="card p-5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-semibold">{f.student_name} <Stars value={f.rating} /></span>
                  <Link href={`/cours/${f.lesson_id}`} className="text-earth-500 underline"><LocalDateTime iso={f.starts_at} mode="date" /></Link>
                </div>
                {f.liked && <p className="mt-2"><span className="font-semibold">A aimé :</span> {f.liked}</p>}
                {f.improve && <p className="mt-2 rounded-lg bg-ochre-100 p-2 text-ochre-800"><span className="font-semibold">À améliorer :</span> {f.improve}</p>}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState title="Pas encore de retour">Vos élèves pourront noter chaque séance en quittant la salle de classe.</EmptyState>
      )}
    </section>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: string | number }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-clay-50 text-clay-600"><Icon size={22} /></span>
      <div>
        <p className="text-sm text-earth-500">{label}</p>
        <p className="font-display text-2xl font-semibold">{value}</p>
      </div>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: PageProps<"/tableau-de-bord">) {
  const user = await requireUser("/tableau-de-bord");
  const sp = await searchParams;
  const justBooked = first(sp.reserve) === "1";
  const slotLost = first(sp.creneau) === "perdu";
  const notice = first(sp.verifie) === "1" ? "Adresse e-mail confirmée : votre compte est actif." : first(sp.motdepasse) === "1" ? "Mot de passe modifié. Vos autres appareils ont été déconnectés." : null;
  const noticeBanner = notice && <p className="rounded-2xl bg-forest-100 p-5 font-medium text-forest-800">{notice}</p>;

  if (user.role === "tutor") {
    const [lessons, profile, feedback] = await Promise.all([getTutorLessons(user._id), getTutor(user.id), getTutorFeedbackOverview(user._id)]);
    const requests = lessons.filter((l) => l.status === "pending" && isUpcoming(l)).sort(byDateAsc);
    const upcoming = lessons.filter((l) => l.status === "confirmed" && isUpcoming(l)).sort(byDateAsc);
    const toClose = lessons.filter((l) => l.status === "confirmed" && !isUpcoming(l));
    const history = lessons.filter((l) => !isUpcoming(l) && l.status !== "confirmed");
    const commission = commissionRate();
    const earnings = lessons.filter((l) => l.status === "completed").reduce((sum, l) => sum + l.price * (1 - commission), 0);

    return (
      <>
        <EspaceHeader title={`Karibu, ${user.name.split(" ")[0]} !`}>Gérez vos demandes de cours et votre planning.</EspaceHeader>
        <div className="space-y-10">
          {noticeBanner}
          {profile && (!profile.approved || !profile.headline) && (
            <div className="rounded-2xl bg-ochre-100 p-5 text-ochre-800">
              <p className="font-semibold">{profile.headline ? "Votre profil est en cours de validation." : "Complétez votre profil pour apparaître dans les recherches."}</p>
              <p className="mt-1 text-sm">Les élèves pourront vous réserver dès que notre équipe aura validé votre profil.</p>
              <Link href="/profil/tuteur" className="btn-dark mt-3">Compléter mon profil</Link>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat icon={CalendarDays} label="Cours à venir" value={upcoming.length} />
            <Stat icon={Wallet} label={`Revenus nets (commission ${Math.round(commission * 100)} %)`} value={formatPrice(Math.round(earnings * 100) / 100)} />
            <Stat icon={Star} label="Note moyenne" value={profile?.rating ? `${profile.rating.toFixed(1)} / 5` : "–"} />
          </div>
          <LessonList title="Demandes à traiter" lessons={requests} as="tutor" empty={<EmptyState title="Aucune nouvelle demande" />} />
          <FeedbackSection overview={feedback} />
          <LessonList title="Prochains cours" lessons={upcoming} as="tutor" empty={<EmptyState title="Aucun cours confirmé à venir" />} />
          {toClose.length > 0 && <LessonList title="Cours à clôturer" lessons={toClose} as="tutor" empty={null} />}
          <LessonList title="Historique" lessons={history} as="tutor" empty={<EmptyState title="Pas encore d'historique" />} />
        </div>
      </>
    );
  }

  const [lessons, favorites] = await Promise.all([getStudentLessons(user._id), getFavoriteTutors(user._id)]);
  const upcoming = lessons.filter(isUpcoming).sort(byDateAsc);
  const past = lessons.filter((l) => !isUpcoming(l));

  return (
    <>
      <EspaceHeader title={`Habari, ${user.name.split(" ")[0]} !`}>Retrouvez vos cours, laissez des avis et suivez vos tuteurs favoris.</EspaceHeader>
      <div className="space-y-10">
          {noticeBanner}
        {justBooked && (
          <p className="rounded-2xl bg-forest-100 p-5 font-medium text-forest-800">
            Demande envoyée ! Le tuteur va la confirmer, puis le lien de visio apparaîtra ici.
          </p>
        )}
        {slotLost && (
          <p className="rounded-2xl bg-clay-50 p-5 font-medium text-clay-800">
            Ce créneau n&apos;est plus disponible : la réservation a été annulée sans frais. Choisissez un autre horaire.
          </p>
        )}
        {user.role === "admin" && (
          <p className="rounded-2xl bg-sand-100 p-5 text-earth-700">Vous êtes administrateur. <Link href="/admin" className="font-semibold text-clay-700 underline">Ouvrir l&apos;administration</Link></p>
        )}
        <LessonList
          title="Cours à venir"
          lessons={upcoming}
          as="student"
          empty={<EmptyState title="Aucun cours prévu"><Link href="/tuteurs" className="btn-primary mt-3">Trouver un tuteur</Link></EmptyState>}
        />
        <p className="-mt-7 text-sm text-earth-500">Annulation gratuite jusqu&apos;à {FREE_CANCELLATION_HOURS} h avant le cours. Remboursement complet si le tuteur refuse ou annule.</p>
        {favorites.length > 0 && (
          <section>
            <h2 className="mb-4 font-display text-2xl font-semibold">Mes tuteurs favoris</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{favorites.map((t) => <TutorTile key={t.id} tutor={t} />)}</div>
          </section>
        )}
        <LessonList title="Cours passés" lessons={past} as="student" empty={<EmptyState title="Pas encore de cours passé" />} />
      </div>
    </>
  );
}

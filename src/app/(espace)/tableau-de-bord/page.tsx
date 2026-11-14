import Link from "next/link";
import { CalendarDays, CircleCheck, NotebookText, Star, Video, Wallet } from "lucide-react";
import { TutorTile } from "@/components/cards";
import { LocalDateTime, SubmitButton } from "@/components/client";
import { ReviewForm } from "@/components/ReviewForm";
import { StudentHighlights } from "@/components/student/StudentHighlights";
import { Avatar, EmptyState, EspaceHeader, Stars } from "@/components/ui";
import { defineMessages, type Locale } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { acceptProposal, payLesson, updateLesson } from "@/lib/actions/lessons";
import { requireUser } from "@/lib/auth";
import { LESSON_STATUS, first, formatPrice } from "@/lib/constants";
import { FREE_CANCELLATION_HOURS, commissionRate } from "@/lib/payments";
import { getFavoriteTutors, getStudentLessons, getTutor, getTutorFeedbackOverview, getTutorLessons, type Lesson, type TutorFeedbackOverview } from "@/lib/queries";

type PaymentStatus = NonNullable<Lesson["payment"]>["status"];

const PAYMENT_CLASSES: Record<PaymentStatus, string> = {
  paid: "bg-forest-100 text-forest-800",
  pending: "bg-ochre-100 text-ochre-800",
  failed: "bg-clay-100 text-clay-800",
  refunded: "bg-sand-200 text-earth-800",
  refund_failed: "bg-ochre-100 text-ochre-800",
};

const M = defineMessages<{
  payment: Record<PaymentStatus, string>; proposedByTutor: string; awaitingStudent: string; weekly: string; yourReview: string;
  acceptPay: string; decline: string; pay: string; classroom: string; accept: string; complete: string; cancelProposal: string; cancel: string;
  summary: string; message: string; criteria: Record<"clarity" | "interaction" | "content" | "pace", string>; feedbackTitle: string;
  feedbackLead: string; average: (n: number) => string; liked: string; improve: string; noFeedback: string; noFeedbackText: string;
  verified: string; passwordChanged: string; tutorLead: string; myCalendar: string; pendingProfile: string; incompleteProfile: string;
  profileText: string; completeProfile: string; upcomingCount: string; netEarnings: (pct: number) => string; avgRating: string;
  requests: string; noRequests: string; proposals: string; nextLessons: string; noUpcoming: string; toClose: string; history: string;
  noHistory: string; studentLead: string; booked: string; slotLost: string; admin: string; openAdmin: string; upcoming: string; noneTitle: string;
  findTutor: string; cancellation: (hours: number) => string; favorites: string; allTutors: string; past: string; noPast: string;
}>({
  en: {
    payment: { paid: "Paid", pending: "Payment pending", failed: "Payment failed", refunded: "Refunded", refund_failed: "Refund in progress" },
    proposedByTutor: "Proposed by your tutor", awaitingStudent: "Waiting for the student", weekly: "Weekly", yourReview: "Your review:",
    acceptPay: "Accept and pay", decline: "Decline", pay: "Pay", classroom: "Classroom", accept: "Accept", complete: "Mark as completed",
    cancelProposal: "Cancel the proposal", cancel: "Cancel", summary: "Summary", message: "Message",
    criteria: { clarity: "Clarity", interaction: "Interaction", content: "Content", pace: "Pace" },
    feedbackTitle: "Feedback from your students", feedbackLead: "Private ratings left after each session: they don't show on your public profile.",
    average: (n) => `Average (${n} session${n > 1 ? "s" : ""})`, liked: "Liked:", improve: "To improve:", noFeedback: "No feedback yet",
    noFeedbackText: "Your students can rate each session when they leave the classroom.",
    verified: "Email address confirmed: your account is active.", passwordChanged: "Password changed. Your other devices have been logged out.",
    tutorLead: "Manage your lesson requests and your schedule.", myCalendar: "My calendar",
    pendingProfile: "Your profile is being reviewed.", incompleteProfile: "Complete your profile to appear in searches.",
    profileText: "Students will be able to book you as soon as our team has approved your profile.", completeProfile: "Complete my profile",
    upcomingCount: "Upcoming lessons", netEarnings: (pct) => `Net earnings (${pct}% commission)`, avgRating: "Average rating",
    requests: "Requests to handle", noRequests: "No new requests", proposals: "Proposed lessons, waiting for the student",
    nextLessons: "Next lessons", noUpcoming: "No confirmed lessons coming up", toClose: "Lessons to close", history: "History", noHistory: "No history yet",
    studentLead: "Find your lessons, leave reviews and follow your favourite tutors.",
    booked: "Request sent! The tutor will confirm it, then the video link will appear here.",
    slotLost: "This slot is no longer available: the booking was cancelled free of charge. Choose another time.",
    admin: "You're an administrator.", openAdmin: "Open the administration", upcoming: "Upcoming lessons", noneTitle: "No lessons planned",
    findTutor: "Find a tutor", cancellation: (h) => `Free cancellation up to ${h} hours before the lesson. Full refund if the tutor declines or cancels.`,
    favorites: "My favourite tutors", allTutors: "All my tutors", past: "Past lessons", noPast: "No past lessons yet",
  },
  fr: {
    payment: { paid: "Payé", pending: "Paiement en attente", failed: "Paiement non abouti", refunded: "Remboursé", refund_failed: "Remboursement en cours" },
    proposedByTutor: "Proposé par votre tuteur", awaitingStudent: "En attente de l'élève", weekly: "Hebdomadaire", yourReview: "Votre avis :",
    acceptPay: "Accepter et payer", decline: "Refuser", pay: "Payer", classroom: "Salle de classe", accept: "Accepter", complete: "Marquer terminé",
    cancelProposal: "Annuler la proposition", cancel: "Annuler", summary: "Résumé", message: "Message",
    criteria: { clarity: "Clarté", interaction: "Interaction", content: "Contenu", pace: "Rythme" },
    feedbackTitle: "Retours de vos élèves", feedbackLead: "Notes privées laissées après chaque séance : elles ne s'affichent pas sur votre profil public.",
    average: (n) => `Moyenne (${n} séance${n > 1 ? "s" : ""})`, liked: "A aimé :", improve: "À améliorer :", noFeedback: "Pas encore de retour",
    noFeedbackText: "Vos élèves pourront noter chaque séance en quittant la salle de classe.",
    verified: "Adresse e-mail confirmée : votre compte est actif.", passwordChanged: "Mot de passe modifié. Vos autres appareils ont été déconnectés.",
    tutorLead: "Gérez vos demandes de cours et votre planning.", myCalendar: "Mon calendrier",
    pendingProfile: "Votre profil est en cours de validation.", incompleteProfile: "Complétez votre profil pour apparaître dans les recherches.",
    profileText: "Les élèves pourront vous réserver dès que notre équipe aura validé votre profil.", completeProfile: "Compléter mon profil",
    upcomingCount: "Cours à venir", netEarnings: (pct) => `Revenus nets (commission ${pct} %)`, avgRating: "Note moyenne",
    requests: "Demandes à traiter", noRequests: "Aucune nouvelle demande", proposals: "Cours proposés, en attente de l'élève",
    nextLessons: "Prochains cours", noUpcoming: "Aucun cours confirmé à venir", toClose: "Cours à clôturer", history: "Historique", noHistory: "Pas encore d'historique",
    studentLead: "Retrouvez vos cours, laissez des avis et suivez vos tuteurs favoris.",
    booked: "Demande envoyée ! Le tuteur va la confirmer, puis le lien de visio apparaîtra ici.",
    slotLost: "Ce créneau n'est plus disponible : la réservation a été annulée sans frais. Choisissez un autre horaire.",
    admin: "Vous êtes administrateur.", openAdmin: "Ouvrir l'administration", upcoming: "Cours à venir", noneTitle: "Aucun cours prévu",
    findTutor: "Trouver un tuteur", cancellation: (h) => `Annulation gratuite jusqu'à ${h} h avant le cours. Remboursement complet si le tuteur refuse ou annule.`,
    favorites: "Mes tuteurs favoris", allTutors: "Tous mes tuteurs", past: "Cours passés", noPast: "Pas encore de cours passé",
  },
});

type Texts = (typeof M)["en"];

export const generateMetadata = () => titled({ en: "My lessons", fr: "Mes cours" });

const hasStarted = (l: Lesson) => new Date(l.starts_at).getTime() <= Date.now();
const isUpcoming = (l: Lesson) => ["pending", "confirmed"].includes(l.status) && !hasStarted(l);
const byDateAsc = (a: Lesson, b: Lesson) => a.starts_at.localeCompare(b.starts_at);
// Confirmed lessons stay joinable until 30 minutes after their end.
const upcomingOrLive = (l: Lesson) => new Date(l.starts_at).getTime() + (l.duration_minutes + 30) * 60 * 1000 > Date.now();

function LessonRow({ lesson, as, t, locale }: { lesson: Lesson; as: "student" | "tutor"; t: Texts; locale: Locale }) {
  const status = LESSON_STATUS[lesson.status];
  const upcoming = !hasStarted(lesson);
  const action = (name: Parameters<typeof updateLesson>[1]) => updateLesson.bind(null, lesson.id, name);
  // Scheduled by the tutor from the calendar, not answered yet by the student.
  const proposal = lesson.proposed_by_tutor && lesson.status === "pending";

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
          <span className={`chip ${status.className}`}>{proposal ? (as === "student" ? t.proposedByTutor : t.awaitingStudent) : status.label[locale]}</span>
          {lesson.weekly && <span className="chip bg-clay-100 text-clay-800">{t.weekly}</span>}
          {as === "student" && lesson.payment && (
            <span className={`chip ${PAYMENT_CLASSES[lesson.payment.status]}`}>{t.payment[lesson.payment.status]} · {lesson.payment.amount_label}</span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-earth-600">
          {lesson.language_name} · <LocalDateTime iso={lesson.starts_at} /> · {lesson.duration_minutes} min · {formatPrice(lesson.price, locale)}
        </p>
        {lesson.message && <p className="mt-1 text-sm italic text-earth-500">« {lesson.message} »</p>}
        {lesson.review_rating && <p className="mt-1 flex items-center gap-2 text-sm text-earth-500">{t.yourReview} <Stars value={lesson.review_rating} /></p>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {as === "student" && proposal && upcoming && (
          <>
            <form action={acceptProposal.bind(null, lesson.id)}><SubmitButton className="btn-primary"><Wallet size={16} /> {t.acceptPay}</SubmitButton></form>
            <form action={action("decline")}><SubmitButton className="btn-outline">{t.decline}</SubmitButton></form>
          </>
        )}
        {as === "student" && !proposal && lesson.status === "pending" && upcoming && (lesson.payment?.status === "pending" || lesson.payment?.status === "failed") && (
          <form action={payLesson.bind(null, lesson.id)}><SubmitButton className="btn-primary"><Wallet size={16} /> {t.pay}</SubmitButton></form>
        )}
        {lesson.status === "confirmed" && upcomingOrLive(lesson) && (
          <Link href={`/classe/${lesson.id}`} className="btn-dark"><Video size={16} /> {t.classroom}</Link>
        )}
        {as === "tutor" && lesson.status === "pending" && !proposal && (
          <>
            <form action={action("confirm")}><SubmitButton className="btn-primary">{t.accept}</SubmitButton></form>
            <form action={action("decline")}><SubmitButton className="btn-outline">{t.decline}</SubmitButton></form>
          </>
        )}
        {as === "tutor" && lesson.status === "confirmed" && !upcoming && (
          <form action={action("complete")}><SubmitButton className="btn-primary"><CircleCheck size={16} /> {t.complete}</SubmitButton></form>
        )}
        {upcoming && ["pending", "confirmed"].includes(lesson.status) && !(as === "tutor" && lesson.status === "pending" && !proposal) && !(as === "student" && proposal) && (
          <form action={action("cancel")}><SubmitButton className="btn-ghost text-clay-700">{proposal ? t.cancelProposal : t.cancel}</SubmitButton></form>
        )}
        {as === "student" && lesson.status === "completed" && !lesson.review_rating && <ReviewForm lessonId={lesson.id} />}
        {["confirmed", "completed"].includes(lesson.status) && (
          <Link href={`/cours/${lesson.id}`} className="btn-ghost"><NotebookText size={16} /> {t.summary}</Link>
        )}
        <Link href={`/messages/${lesson.other_id}`} className="btn-ghost">{t.message}</Link>
      </div>
    </div>
  );
}

function LessonList({ title, lessons, as, empty, id, t, locale }: { title: string; lessons: Lesson[]; as: "student" | "tutor"; empty: React.ReactNode; id?: string; t: Texts; locale: Locale }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-4 font-display text-2xl font-semibold">{title}</h2>
      <div className="space-y-3">{lessons.length ? lessons.map((l) => <LessonRow key={l.id} lesson={l} as={as} t={t} locale={locale} />) : empty}</div>
    </section>
  );
}

// Private session ratings from students, to help the tutor improve.
function FeedbackSection({ overview, t }: { overview: TutorFeedbackOverview; t: Texts }) {
  return (
    <section>
      <h2 className="mb-1 font-display text-2xl font-semibold">{t.feedbackTitle}</h2>
      <p className="mb-4 text-sm text-earth-600">{t.feedbackLead}</p>
      {overview.averages ? (
        <div className="space-y-4">
          <div className="card grid gap-4 p-5 sm:grid-cols-5">
            <div>
              <p className="text-sm text-earth-500">{t.average(overview.count)}</p>
              <p className="font-display text-3xl font-semibold">{overview.averages.rating.toFixed(1)}</p>
            </div>
            {(Object.keys(t.criteria) as (keyof Texts["criteria"])[]).map((key) => (
              <div key={key}>
                <p className="text-sm text-earth-500">{t.criteria[key]}</p>
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
                {f.liked && <p className="mt-2"><span className="font-semibold">{t.liked}</span> {f.liked}</p>}
                {f.improve && <p className="mt-2 rounded-lg bg-ochre-100 p-2 text-ochre-800"><span className="font-semibold">{t.improve}</span> {f.improve}</p>}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState title={t.noFeedback}>{t.noFeedbackText}</EmptyState>
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
  const locale = await getLocale();
  const t = M[locale];
  const sp = await searchParams;
  const justBooked = first(sp.reserve) === "1";
  const slotLost = first(sp.creneau) === "perdu";
  const notice = first(sp.verifie) === "1" ? t.verified : first(sp.motdepasse) === "1" ? t.passwordChanged : null;
  const noticeBanner = notice && <p className="rounded-2xl bg-forest-100 p-5 font-medium text-forest-800">{notice}</p>;
  const list = { t, locale };

  if (user.role === "tutor") {
    const [lessons, profile, feedback] = await Promise.all([getTutorLessons(user._id), getTutor(user.id), getTutorFeedbackOverview(user._id)]);
    const requests = lessons.filter((l) => l.status === "pending" && !l.proposed_by_tutor && isUpcoming(l)).sort(byDateAsc);
    const proposals = lessons.filter((l) => l.status === "pending" && l.proposed_by_tutor && isUpcoming(l)).sort(byDateAsc);
    const upcoming = lessons.filter((l) => l.status === "confirmed" && isUpcoming(l)).sort(byDateAsc);
    const toClose = lessons.filter((l) => l.status === "confirmed" && !isUpcoming(l));
    const history = lessons.filter((l) => !isUpcoming(l) && l.status !== "confirmed");
    const commission = commissionRate();
    const earnings = lessons.filter((l) => l.status === "completed").reduce((sum, l) => sum + l.price * (1 - commission), 0);

    return (
      <>
        <EspaceHeader
          title={`Karibu, ${user.name.split(" ")[0]}!`}
          actions={<Link href="/calendrier" className="btn-dark"><CalendarDays size={16} /> {t.myCalendar}</Link>}
        >
          {t.tutorLead}
        </EspaceHeader>
        <div className="space-y-10">
          {noticeBanner}
          {profile && (!profile.approved || !profile.headline) && (
            <div className="rounded-2xl bg-ochre-100 p-5 text-ochre-800">
              <p className="font-semibold">{profile.headline ? t.pendingProfile : t.incompleteProfile}</p>
              <p className="mt-1 text-sm">{t.profileText}</p>
              <Link href="/profil/tuteur" className="btn-dark mt-3">{t.completeProfile}</Link>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat icon={CalendarDays} label={t.upcomingCount} value={upcoming.length} />
            <Stat icon={Wallet} label={t.netEarnings(Math.round(commission * 100))} value={formatPrice(Math.round(earnings * 100) / 100, locale)} />
            <Stat icon={Star} label={t.avgRating} value={profile?.rating ? `${profile.rating.toFixed(1)} / 5` : "–"} />
          </div>
          <LessonList title={t.requests} lessons={requests} as="tutor" empty={<EmptyState title={t.noRequests} />} {...list} />
          {proposals.length > 0 && <LessonList title={t.proposals} lessons={proposals} as="tutor" empty={null} {...list} />}
          <FeedbackSection overview={feedback} t={t} />
          <LessonList title={t.nextLessons} lessons={upcoming} as="tutor" empty={<EmptyState title={t.noUpcoming} />} {...list} />
          {toClose.length > 0 && <LessonList title={t.toClose} lessons={toClose} as="tutor" empty={null} {...list} />}
          <LessonList title={t.history} lessons={history} as="tutor" empty={<EmptyState title={t.noHistory} />} {...list} />
        </div>
      </>
    );
  }

  const [lessons, favorites] = await Promise.all([getStudentLessons(user._id), getFavoriteTutors(user._id)]);
  const upcoming = lessons.filter(isUpcoming).sort(byDateAsc);
  const past = lessons.filter((l) => !isUpcoming(l));

  return (
    <>
      <EspaceHeader title={`Habari, ${user.name.split(" ")[0]}!`}>{t.studentLead}</EspaceHeader>
      <div className="space-y-10">
        {noticeBanner}
        {justBooked && <p className="rounded-2xl bg-forest-100 p-5 font-medium text-forest-800">{t.booked}</p>}
        {slotLost && <p className="rounded-2xl bg-clay-50 p-5 font-medium text-clay-800">{t.slotLost}</p>}
        {user.role === "admin" && (
          <p className="rounded-2xl bg-sand-100 p-5 text-earth-700">{t.admin} <Link href="/admin" className="font-semibold text-clay-700 underline">{t.openAdmin}</Link></p>
        )}
        <StudentHighlights lessons={lessons} />
        <LessonList
          id="cours-a-venir"
          title={t.upcoming}
          lessons={upcoming}
          as="student"
          empty={<EmptyState title={t.noneTitle}><Link href="/tuteurs" className="btn-primary mt-3">{t.findTutor}</Link></EmptyState>}
          {...list}
        />
        <p className="-mt-7 text-sm text-earth-500">{t.cancellation(FREE_CANCELLATION_HOURS)}</p>
        {favorites.length > 0 && (
          <section>
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h2 className="font-display text-2xl font-semibold">{t.favorites}</h2>
              <Link href="/mes-tuteurs" className="text-sm font-semibold underline underline-offset-4">{t.allTutors}</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{favorites.map((tutor) => <TutorTile key={tutor.id} tutor={tutor} />)}</div>
          </section>
        )}
        <LessonList id="cours-passes" title={t.past} lessons={past} as="student" empty={<EmptyState title={t.noPast} />} {...list} />
      </div>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, CheckCircle2, EyeOff, Mail, MessageCircle, RotateCcw } from "lucide-react";
import { BlockForm, DeleteForm, MessageForm, SuspendForm } from "@/components/admin/AdminForms";
import { SubmitButton } from "@/components/client";
import { Avatar } from "@/components/ui";
import { defineMessages, intlLocale } from "@/i18n";
import { countryName } from "@/i18n/catalog";
import { getLocale } from "@/i18n/server";
import { reactivateMember, setTutorApproval, setUserRole } from "@/lib/actions/admin";
import { getMemberDetail } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { formatPrice, timeAgo } from "@/lib/constants";
import { toObjectId } from "@/lib/db";
import { publicOrigin } from "@/lib/site";
import { ACTION_LABELS, ROLE_LABELS, ROLE_STYLE, STATUS_LABELS, STATUS_STYLE } from "../../labels";
import { StudentProgressSection, TutorStudentsSection } from "./sections";

const M = defineMessages({
  en: {
    back: "All members", joined: (ago: string) => `Joined ${ago}`, lastSeen: (ago: string) => `last seen ${ago}`, neverSeen: "not seen since this was tracked",
    verified: "E-mail confirmed", notVerified: "E-mail not confirmed", google: "Google account", sessions: (n: number) => `${n} open session${n === 1 ? "" : "s"}`,
    suspendedUntil: (d: string) => `Suspended until ${d}`, suspendedOpen: "Suspended until reactivated", reason: "Reason:",
    tutor: "Tutor profile", approved: "Visible in the search", notApproved: "Not approved", publicProfile: "Public profile", rating: "rating",
    changes: "Changes asked:", approve: "Approve", hide: "Hide from search",
    activity: "Activity", asStudent: "Lessons taken", asTutor: "Lessons given", stat: (total: number, completed: number, upcoming: number) => `${total} · ${completed} completed · ${upcoming} upcoming`,
    spent: "Paid", earned: "Earned (net)", messages: "Messages", messagesValue: (s: number, r: number) => `${s} sent · ${r} received`,
    reviews: "Reviews", reviewsValue: (g: number, r: number) => `${g} given · ${r} received`, forum: "Forum", forumValue: (t: number, r: number) => `${t} topics · ${r} replies`,
    favorites: "Favourite tutors",
    lessons: "Recent lessons", noLessons: "No lessons yet.", with: "with", asLearner: "learner", asTeacher: "teacher",
    status: { pending: "Pending", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled" } as Record<string, string>,
    moderation: "Account", reactivate: "Reactivate the account", toStudent: "Make student", toTutor: "Make tutor",
    adminAccount: "This is an administrator account: it cannot be suspended, blocked or deleted from here.",
    write: "Write to the member", conversation: "Open the conversation", history: "Team history", noHistory: "No action of the team on this account yet.",
  },
  fr: {
    back: "Tous les membres", joined: (ago: string) => `Inscrit ${ago}`, lastSeen: (ago: string) => `vu ${ago}`, neverSeen: "pas vu depuis le suivi de l'activité",
    verified: "E-mail confirmé", notVerified: "E-mail non confirmé", google: "Compte Google", sessions: (n: number) => `${n} session${n > 1 ? "s" : ""} ouverte${n > 1 ? "s" : ""}`,
    suspendedUntil: (d: string) => `Suspendu jusqu'au ${d}`, suspendedOpen: "Suspendu jusqu'à réactivation", reason: "Motif :",
    tutor: "Profil de tuteur", approved: "Visible dans la recherche", notApproved: "Non validé", publicProfile: "Profil public", rating: "note",
    changes: "Modifications demandées :", approve: "Valider", hide: "Masquer de la recherche",
    activity: "Activité", asStudent: "Cours suivis", asTutor: "Cours donnés", stat: (total: number, completed: number, upcoming: number) => `${total} · ${completed} terminés · ${upcoming} à venir`,
    spent: "Payé", earned: "Gagné (net)", messages: "Messages", messagesValue: (s: number, r: number) => `${s} envoyés · ${r} reçus`,
    reviews: "Avis", reviewsValue: (g: number, r: number) => `${g} donnés · ${r} reçus`, forum: "Forum", forumValue: (t: number, r: number) => `${t} sujets · ${r} réponses`,
    favorites: "Tuteurs favoris",
    lessons: "Cours récents", noLessons: "Aucun cours pour l'instant.", with: "avec", asLearner: "élève", asTeacher: "tuteur",
    status: { pending: "En attente", confirmed: "Confirmé", completed: "Terminé", cancelled: "Annulé" } as Record<string, string>,
    moderation: "Compte", reactivate: "Réactiver le compte", toStudent: "Passer en élève", toTutor: "Passer en tuteur",
    adminAccount: "C'est un compte administrateur : il ne peut pas être suspendu, bloqué ou supprimé ici.",
    write: "Écrire au membre", conversation: "Ouvrir la conversation", history: "Historique de l'équipe", noHistory: "Aucune action de l'équipe sur ce compte pour l'instant.",
  },
});

export async function generateMetadata({ params }: PageProps<"/gestion/utilisateurs/[id]">) {
  const detail = await getMemberDetail((await params).id);
  return { title: detail?.user.name ?? "Member" };
}

export default async function MemberPage({ params }: PageProps<"/gestion/utilisateurs/[id]">) {
  const admin = await requireAdmin();
  const { id } = await params;
  const [detail, locale, publicUrl] = await Promise.all([getMemberDetail(id), getLocale(), publicOrigin()]);
  if (!detail) notFound();
  const t = M[locale];
  const { user, activity } = detail;
  const isAdmin = user.role === "admin";
  const memberId = toObjectId(user.id)!;
  const date = (iso: string) => new Date(iso).toLocaleDateString(intlLocale(locale), { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <Link href="/utilisateurs" className="inline-flex items-center gap-1 text-sm font-semibold text-earth-600 hover:text-clay-700"><ArrowLeft size={16} /> {t.back}</Link>

      <header className="card flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <Avatar name={user.name} src={user.avatar_url} size={72} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold">{user.name}</h1>
            <span className={`chip ${ROLE_STYLE[user.role]}`}>{ROLE_LABELS[locale][user.role]}</span>
            <span className={`chip ${STATUS_STYLE[user.status]}`}>{STATUS_LABELS[locale][user.status]}</span>
          </div>
          <p className="flex items-center gap-1.5 text-earth-700"><Mail size={14} /> {user.email}</p>
          <p className="text-sm text-earth-500">
            {[
              user.country && countryName(user.country, locale),
              t.joined(timeAgo(user.joined_at, locale)),
              user.last_seen_at ? t.lastSeen(timeAgo(user.last_seen_at, locale)) : t.neverSeen,
              user.email_verified ? t.verified : t.notVerified,
              user.google && t.google,
              t.sessions(activity.sessions),
            ].filter(Boolean).join(" · ")}
          </p>
          {user.status !== "active" && (
            <p className="text-sm text-clay-800">
              {user.status === "suspended" && (user.suspended_until ? t.suspendedUntil(date(user.suspended_until)) : t.suspendedOpen)}
              {user.moderation && <> {t.reason} « {user.moderation.reason} »</>}
            </p>
          )}
        </div>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          {user.tutor && (
            <section className="card p-5">
              <h2 className="mb-2 font-display text-xl font-semibold">{t.tutor}</h2>
              <p className="flex flex-wrap items-center gap-2 text-sm">
                {user.tutor.approved ? <span className="chip bg-forest-100 text-forest-800"><BadgeCheck size={13} /> {t.approved}</span> : <span className="chip bg-ochre-100 text-ochre-800">{t.notApproved}</span>}
                <span className="text-earth-600">{formatPrice(user.tutor.hourly_rate, locale)}{user.tutor.rating !== null && ` · ${user.tutor.rating}/5 ${t.rating}`}</span>
                {user.tutor.approved && <a href={`${publicUrl}/tuteurs/${user.id}`} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">{t.publicProfile}</a>}
              </p>
              {user.tutor.headline && <p className="mt-2 font-medium">{user.tutor.headline}</p>}
              {user.tutor.review && <p className="mt-2 text-sm italic text-earth-600">{t.changes} « {user.tutor.review} »</p>}
              {user.status === "active" && (
                <form action={setTutorApproval.bind(null, user.id, !user.tutor.approved)} className="mt-3">
                  {user.tutor.approved
                    ? <SubmitButton className="btn-outline"><EyeOff size={16} /> {t.hide}</SubmitButton>
                    : <SubmitButton><CheckCircle2 size={16} /> {t.approve}</SubmitButton>}
                </form>
              )}
            </section>
          )}

          <section className="card p-5">
            <h2 className="mb-3 font-display text-xl font-semibold">{t.activity}</h2>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {[
                [t.asStudent, t.stat(activity.asStudent.total, activity.asStudent.completed, activity.asStudent.upcoming)],
                [t.asTutor, t.stat(activity.asTutor.total, activity.asTutor.completed, activity.asTutor.upcoming)],
                [t.spent, formatPrice(activity.spent, locale)],
                [t.earned, formatPrice(activity.earned, locale)],
                [t.messages, t.messagesValue(activity.messagesSent, activity.messagesReceived)],
                [t.reviews, t.reviewsValue(activity.reviewsGiven, activity.reviewsReceived)],
                [t.forum, t.forumValue(activity.topics, activity.replies)],
                [t.favorites, String(activity.favorites)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-earth-500">{label}</dt>
                  <dd className="font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-display text-xl font-semibold">{t.lessons}</h2>
            {detail.lessons.length ? (
              <ul className="divide-y divide-sand-200 text-sm">
                {detail.lessons.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span>
                      <span className="font-medium">{new Date(l.starts_at).toLocaleString(intlLocale(locale), { dateStyle: "medium", timeStyle: "short" })}</span>
                      <span className="text-earth-600"> · {l.as === "student" ? t.asLearner : t.asTeacher} {t.with} {l.other_name}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="tabular-nums text-earth-600">{formatPrice(l.price, locale)}</span>
                      <span className="chip bg-sand-100 text-earth-700">{t.status[l.status] ?? l.status}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-earth-600">{t.noLessons}</p>
            )}
          </section>

          {user.tutor && <TutorStudentsSection tutorId={memberId} locale={locale} />}
          <StudentProgressSection studentId={memberId} locale={locale} />
        </div>

        <div className="space-y-6">
          <section className="card space-y-3 p-5">
            <h2 className="font-display text-xl font-semibold">{t.moderation}</h2>
            {isAdmin ? (
              <p className="text-sm text-earth-600">{t.adminAccount}</p>
            ) : (
              <>
                {user.status !== "active" && (
                  <form action={reactivateMember.bind(null, user.id)}>
                    <SubmitButton><RotateCcw size={16} /> {t.reactivate}</SubmitButton>
                  </form>
                )}
                <div className="flex flex-wrap items-start gap-2">
                  {user.status === "active" && <SuspendForm userId={user.id} />}
                  {user.status !== "blocked" && <BlockForm userId={user.id} />}
                  <DeleteForm userId={user.id} email={user.email} />
                </div>
                <form action={setUserRole.bind(null, user.id, user.role === "tutor" ? "student" : "tutor")}>
                  <SubmitButton className="btn-ghost text-sm">{user.role === "tutor" ? t.toStudent : t.toTutor}</SubmitButton>
                </form>
              </>
            )}
          </section>

          {user.id !== admin.id && (
            <section id="message" className="card scroll-mt-24 space-y-3 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-xl font-semibold">{t.write}</h2>
                <Link href={`/messages/${user.id}`} className="inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4"><MessageCircle size={14} /> {t.conversation}</Link>
              </div>
              <MessageForm userId={user.id} />
            </section>
          )}

          <section className="card p-5">
            <h2 className="mb-3 font-display text-xl font-semibold">{t.history}</h2>
            {detail.logs.length ? (
              <ul className="space-y-3 text-sm">
                {detail.logs.map((g) => (
                  <li key={g.id}>
                    <p className="font-semibold">{ACTION_LABELS[locale][g.action]}</p>
                    {g.note && <p className="text-earth-700">{g.note}</p>}
                    <p className="text-xs text-earth-500">{g.admin_name} · {timeAgo(g.at, locale)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-earth-600">{t.noHistory}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

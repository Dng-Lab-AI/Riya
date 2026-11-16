import Link from "next/link";
import { Check, Clock, ExternalLink, Mail, UserCheck, Video } from "lucide-react";
import { SubmitButton } from "@/components/client";
import { Avatar, EmptyState } from "@/components/ui";
import { defineMessages, type Locale } from "@/i18n";
import { countryName } from "@/i18n/catalog";
import { setTutorApproval } from "@/lib/actions/admin";
import { formatPrice, timeAgo } from "@/lib/constants";
import { listTutorReviews, type ReviewItem } from "@/lib/tutor-review";
import { AskChangesForm } from "./AskChangesForm";

const M = defineMessages<{
  toApprove: string; toApproveLead: string; ready: (n: number) => string; changesAsked: (n: number) => string; unfinished: (n: number) => string;
  unfinishedLead: string; submitted: (ago: string) => string; joinedAgo: (ago: string) => string; asked: (ago: string) => string;
  years: (n: number) => string; video: string; viewProfile: string; write: string; noLanguage: string; noCountry: string; approve: string; noPending: string;
}>({
  en: {
    toApprove: "Tutors to approve", toApproveLead: "A tutor only appears in the search once approved. You get an e-mail as soon as a profile is ready.",
    ready: (n) => `Ready to review (${n})`, changesAsked: (n) => `Changes asked, waiting for the tutor (${n})`,
    unfinished: (n) => `Profile not finished yet (${n})`, unfinishedLead: "They will come up for review on their own once their profile is complete.",
    submitted: (ago) => `Sent ${ago}`, joinedAgo: (ago) => `Joined ${ago}`, asked: (ago) => `Asked ${ago}`,
    years: (n) => `${n} year${n === 1 ? "" : "s"} of experience`, video: "Video", viewProfile: "Member page", write: "Write",
    noLanguage: "No language given", noCountry: "Country not given", approve: "Approve", noPending: "No profiles waiting",
  },
  fr: {
    toApprove: "Tuteurs à valider", toApproveLead: "Un tuteur n'apparaît dans la recherche qu'une fois validé. Vous recevez un e-mail dès qu'un profil est prêt.",
    ready: (n) => `Prêts à valider (${n})`, changesAsked: (n) => `Modifications demandées, en attente du tuteur (${n})`,
    unfinished: (n) => `Profil pas encore terminé (${n})`, unfinishedLead: "Ils reviendront d'eux-mêmes à valider une fois leur profil complet.",
    submitted: (ago) => `Envoyé ${ago}`, joinedAgo: (ago) => `Inscrit ${ago}`, asked: (ago) => `Demandé ${ago}`,
    years: (n) => `${n} an${n > 1 ? "s" : ""} d'expérience`, video: "Vidéo", viewProfile: "Fiche du membre", write: "Écrire",
    noLanguage: "Aucune langue renseignée", noCountry: "Pays non renseigné", approve: "Valider", noPending: "Aucun profil en attente",
  },
});

// Tutor profiles waiting for the team: ready to review, sent back for changes, not finished yet.
export async function TutorReviews({ locale }: { locale: Locale }) {
  const t = M[locale];
  const reviews = await listTutorReviews(locale);
  const tutorLine = (tutor: ReviewItem) =>
    [tutor.languages.join(", ") || t.noLanguage, tutor.country ? countryName(tutor.country, locale) : t.noCountry, formatPrice(tutor.hourly_rate, locale), t.years(tutor.years_experience)].join(" · ");

  return (
    <section id="a-valider" className="scroll-mt-24 space-y-6">
      <div>
        <h2 className="flex items-center gap-2 font-display text-2xl font-semibold"><UserCheck size={22} /> {t.toApprove}</h2>
        <p className="mt-1 text-sm text-earth-600">{t.toApproveLead}</p>
      </div>

      <div>
        <h3 className="mb-3 font-semibold">{t.ready(reviews.ready.length)}</h3>
        {reviews.ready.length ? (
          <div className="space-y-3">
            {reviews.ready.map((tutor) => (
              <article key={tutor.id} className="card p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <Avatar name={tutor.name} src={tutor.avatar_url} size={56} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/utilisateurs/${tutor.id}`} className="font-semibold hover:text-clay-700">{tutor.name}</Link>
                      {tutor.has_video && <span className="chip bg-forest-100 text-forest-800"><Video size={12} /> {t.video}</span>}
                      <span className="chip bg-sand-100 text-earth-600">
                        <Clock size={12} /> {tutor.submitted_at ? t.submitted(timeAgo(tutor.submitted_at, locale)) : t.joinedAgo(timeAgo(tutor.joined_at, locale))}
                      </span>
                    </div>
                    <p className="text-sm text-earth-600">{tutorLine(tutor)}</p>
                    <p className="font-medium">{tutor.headline}</p>
                    <p className="line-clamp-3 text-sm text-earth-600">{tutor.about}</p>
                    <p className="flex items-center gap-1.5 text-xs text-earth-500"><Mail size={12} /> {tutor.email}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-start gap-2 border-t border-sand-200 pt-4">
                  <form action={setTutorApproval.bind(null, tutor.id, true)}>
                    <SubmitButton><Check size={16} /> {t.approve}</SubmitButton>
                  </form>
                  <Link href={`/utilisateurs/${tutor.id}`} className="btn-outline"><ExternalLink size={16} /> {t.viewProfile}</Link>
                  <AskChangesForm tutorId={tutor.id} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title={t.noPending} />
        )}
      </div>

      {reviews.changesAsked.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold">{t.changesAsked(reviews.changesAsked.length)}</h3>
          <ul className="card divide-y divide-sand-200">
            {reviews.changesAsked.map((tutor) => (
              <li key={tutor.id} className="flex flex-col gap-1 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/utilisateurs/${tutor.id}`} className="font-semibold hover:text-clay-700">{tutor.name}</Link>
                  <span className="text-xs text-earth-500">{tutor.review && t.asked(timeAgo(tutor.review.at, locale))}</span>
                </div>
                <p className="text-sm italic text-earth-600">« {tutor.review?.note} »</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reviews.unfinished.length > 0 && (
        <details className="card p-4">
          <summary className="cursor-pointer font-semibold">{t.unfinished(reviews.unfinished.length)}</summary>
          <p className="mt-2 text-sm text-earth-600">{t.unfinishedLead}</p>
          <ul className="mt-3 divide-y divide-sand-200">
            {reviews.unfinished.map((tutor) => (
              <li key={tutor.id} className="flex flex-wrap items-center gap-3 py-3">
                <Avatar name={tutor.name} src={tutor.avatar_url} size={36} />
                <div className="min-w-0 flex-1">
                  <Link href={`/utilisateurs/${tutor.id}`} className="font-medium hover:text-clay-700">{tutor.name}</Link>
                  <p className="truncate text-xs text-earth-500">{tutor.email} · {t.joinedAgo(timeAgo(tutor.joined_at, locale))}</p>
                </div>
                <Link href={`/utilisateurs/${tutor.id}#message`} className="btn-ghost text-xs">{t.write}</Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

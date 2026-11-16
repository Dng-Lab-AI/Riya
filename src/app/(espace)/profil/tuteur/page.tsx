import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, Clock, ExternalLink, MessageSquareWarning, PencilLine } from "lucide-react";
import { TutorProfileForm } from "@/components/ProfileForms";
import { TutorVideoField } from "@/components/TutorVideoField";
import { EspaceHeader, Panel } from "@/components/ui";
import { defineMessages } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { first } from "@/lib/constants";
import { commissionRate } from "@/lib/payments";
import { getTutor, listLanguages } from "@/lib/queries";
import { isProfileComplete } from "@/lib/tutor-review";

const M = defineMessages({
  en: {
    title: "Tutor profile", publicProfile: "View my public profile", approved: "Approved and visible to students",
    pending: "Waiting for approval by the Riya team", incomplete: "Complete your profile to send it for review",
    pendingText: "Our team has been told. You'll get an e-mail as soon as your profile is approved and visible in the search.",
    changes: "Our team asks for a few changes", changesText: "Update your profile below, then save it: it will be sent back to our team automatically.",
    welcome: "Welcome to the Riya tutor community!",
    welcomeText: "Complete your profile: our team will approve it quickly so it shows up in searches.",
    video: "Presentation video", videoHint: "A short video (2 minutes maximum) shown at the top of your public profile.",
  },
  fr: {
    title: "Profil de tuteur", publicProfile: "Voir mon profil public", approved: "Validé et visible par les élèves",
    pending: "En attente de validation par l'équipe Riya", incomplete: "Complétez votre profil pour l'envoyer en validation",
    pendingText: "Notre équipe est prévenue. Vous recevrez un e-mail dès que votre profil sera validé et visible dans la recherche.",
    changes: "Notre équipe demande quelques modifications", changesText: "Modifiez votre profil ci-dessous, puis enregistrez-le : il sera automatiquement renvoyé à notre équipe.",
    welcome: "Bienvenue dans la communauté des tuteurs Riya !",
    welcomeText: "Complétez votre profil : notre équipe le validera rapidement pour qu'il apparaisse dans les recherches.",
    video: "Vidéo de présentation", videoHint: "Une courte vidéo (2 minutes maximum) affichée en haut de votre profil public.",
  },
});

export const generateMetadata = () => titled({ en: M.en.title, fr: M.fr.title });

export default async function TutorProfilePage({ searchParams }: PageProps<"/profil/tuteur">) {
  const user = await requireUser("/profil/tuteur");
  if (user.role !== "tutor") redirect("/profil");
  const welcome = first((await searchParams).bienvenue) === "1";
  const [tutor, languages, locale, doc] = await Promise.all([
    getTutor(user.id),
    listLanguages(),
    getLocale(),
    getDb().then((db) => db.users.findOne({ _id: user._id }, { projection: { tutor: 1 } })),
  ]);
  if (!tutor || !doc?.tutor) return null;
  const t = M[locale];
  // Where the profile stands in the review by the Riya team.
  const review = doc.tutor.review;
  const complete = isProfileComplete(doc.tutor);

  return (
    <>
      <EspaceHeader
        title={t.title}
        actions={<Link href={`/tuteurs/${user.id}`} className="btn-outline"><ExternalLink size={16} /> {t.publicProfile}</Link>}
      >
        {tutor.approved ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-forest-700"><BadgeCheck size={18} /> {t.approved}</span>
        ) : review ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-clay-700"><MessageSquareWarning size={18} /> {t.changes}</span>
        ) : complete ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-ochre-800"><Clock size={18} /> {t.pending}</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-medium text-earth-600"><PencilLine size={18} /> {t.incomplete}</span>
        )}
      </EspaceHeader>

      {!tutor.approved && review && (
        <div className="mb-6 rounded-[1.5rem] border border-clay-200 bg-clay-50 p-5 text-clay-800" role="status">
          <p className="font-semibold">{t.changes}</p>
          <p className="mt-2 whitespace-pre-line text-sm italic">« {review.note} »</p>
          <p className="mt-2 text-sm">{t.changesText}</p>
        </div>
      )}
      {!tutor.approved && !review && complete && !welcome && (
        <p className="mb-6 rounded-[1.5rem] bg-ochre-100 p-5 text-sm text-ochre-800">{t.pendingText}</p>
      )}

      {welcome && (
        <div className="mb-6 rounded-[1.5rem] bg-forest-100 p-5 text-forest-800">
          <p className="font-semibold">{t.welcome}</p>
          <p className="mt-1 text-sm">{t.welcomeText}</p>
        </div>
      )}

      <Panel
        title={t.video}
        description={t.videoHint}
        className="mb-6"
      >
        <TutorVideoField video={tutor.video} />
      </Panel>

      <TutorProfileForm
        profile={{
          headline: tutor.headline,
          about: tutor.about,
          hourly_rate: tutor.hourly_rate,
          years_experience: tutor.years_experience,
          specialties: tutor.specialties,
          availability: tutor.availability,
          speaks: tutor.speaks,
          has_photo: !!tutor.avatar_url,
          has_schedule: tutor.has_schedule,
          has_video: !!tutor.video,
        }}
        languages={languages.map((l) => ({ slug: l.slug, name: l.name })).sort((a, b) => a.name.localeCompare(b.name, locale))}
        levels={Object.fromEntries(tutor.languages.map((l) => [l.slug, l.level]))}
        commission={commissionRate()}
      />
    </>
  );
}

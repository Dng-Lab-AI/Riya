import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, Clock, ExternalLink } from "lucide-react";
import { TutorProfileForm } from "@/components/ProfileForms";
import { EspaceHeader } from "@/components/ui";
import { defineMessages } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { first } from "@/lib/constants";
import { commissionRate } from "@/lib/payments";
import { getTutor, listLanguages } from "@/lib/queries";

const M = defineMessages({
  en: {
    title: "Tutor profile", publicProfile: "View my public profile", approved: "Approved and visible to students",
    pending: "Waiting for approval by the Riya team", welcome: "Welcome to the Riya tutor community!",
    welcomeText: "Complete your profile: our team will approve it quickly so it shows up in searches.",
  },
  fr: {
    title: "Profil de tuteur", publicProfile: "Voir mon profil public", approved: "Validé et visible par les élèves",
    pending: "En attente de validation par l'équipe Riya", welcome: "Bienvenue dans la communauté des tuteurs Riya !",
    welcomeText: "Complétez votre profil : notre équipe le validera rapidement pour qu'il apparaisse dans les recherches.",
  },
});

export const generateMetadata = () => titled({ en: M.en.title, fr: M.fr.title });

export default async function TutorProfilePage({ searchParams }: PageProps<"/profil/tuteur">) {
  const user = await requireUser("/profil/tuteur");
  if (user.role !== "tutor") redirect("/profil");
  const welcome = first((await searchParams).bienvenue) === "1";
  const [tutor, languages, locale] = await Promise.all([getTutor(user.id), listLanguages(), getLocale()]);
  if (!tutor) return null;
  const t = M[locale];

  return (
    <>
      <EspaceHeader
        title={t.title}
        actions={<Link href={`/tuteurs/${user.id}`} className="btn-outline"><ExternalLink size={16} /> {t.publicProfile}</Link>}
      >
        {tutor.approved ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-forest-700"><BadgeCheck size={18} /> {t.approved}</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-medium text-ochre-800"><Clock size={18} /> {t.pending}</span>
        )}
      </EspaceHeader>

      {welcome && (
        <div className="mb-6 rounded-[1.5rem] bg-forest-100 p-5 text-forest-800">
          <p className="font-semibold">{t.welcome}</p>
          <p className="mt-1 text-sm">{t.welcomeText}</p>
        </div>
      )}

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
        }}
        languages={languages.map((l) => ({ slug: l.slug, name: l.name })).sort((a, b) => a.name.localeCompare(b.name, locale))}
        levels={Object.fromEntries(tutor.languages.map((l) => [l.slug, l.level]))}
        commission={commissionRate()}
      />
    </>
  );
}

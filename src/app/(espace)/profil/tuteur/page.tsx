import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, Clock, ExternalLink } from "lucide-react";
import { TutorProfileForm } from "@/components/ProfileForms";
import { EspaceHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { first } from "@/lib/constants";
import { commissionRate } from "@/lib/payments";
import { getTutor, listLanguages } from "@/lib/queries";

export const metadata: Metadata = { title: "Profil de tuteur" };

export default async function TutorProfilePage({ searchParams }: PageProps<"/profil/tuteur">) {
  const user = await requireUser("/profil/tuteur");
  if (user.role !== "tutor") redirect("/profil");
  const welcome = first((await searchParams).bienvenue) === "1";
  const [tutor, languages] = await Promise.all([getTutor(user.id), listLanguages()]);
  if (!tutor) return null;

  return (
    <>
      <EspaceHeader
        title="Profil de tuteur"
        actions={<Link href={`/tuteurs/${user.id}`} className="btn-outline"><ExternalLink size={16} /> Voir mon profil public</Link>}
      >
        {tutor.approved ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-forest-700"><BadgeCheck size={18} /> Validé et visible par les élèves</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-medium text-ochre-800"><Clock size={18} /> En attente de validation par l&apos;équipe Riya</span>
        )}
      </EspaceHeader>

      {welcome && (
        <div className="mb-6 rounded-[1.5rem] bg-forest-100 p-5 text-forest-800">
          <p className="font-semibold">Bienvenue dans la communauté des tuteurs Riya !</p>
          <p className="mt-1 text-sm">Complétez votre profil : notre équipe le validera rapidement pour qu&apos;il apparaisse dans les recherches.</p>
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
        }}
        languages={languages.map((l) => ({ slug: l.slug, name: l.name })).sort((a, b) => a.name.localeCompare(b.name, "fr"))}
        levels={Object.fromEntries(tutor.languages.map((l) => [l.slug, l.level]))}
        commission={commissionRate()}
      />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { AccountForm, PasswordForm, TutorProfileForm } from "@/components/ProfileForms";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { first } from "@/lib/constants";
import { getTutor, getUserProfile, listLanguages } from "@/lib/queries";

export const metadata: Metadata = { title: "Mon profil" };

export default async function ProfilePage({ searchParams }: PageProps<"/profil">) {
  const user = await requireUser("/profil");
  const welcome = first((await searchParams).bienvenue) === "1";
  const [account, tutor, languages] = await Promise.all([getUserProfile(user.id), user.role === "tutor" ? getTutor(user.id) : null, listLanguages()]);
  if (!account) return null;

  return (
    <>
      <PageHeader eyebrow="Mon compte" title="Mon profil" />
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        {welcome && (
          <div className="rounded-2xl bg-forest-100 p-5 text-forest-800">
            <p className="font-semibold">Bienvenue dans la communauté des tuteurs Riya !</p>
            <p className="mt-1 text-sm">Complétez votre profil ci-dessous. Notre équipe le validera rapidement pour qu&apos;il apparaisse dans les recherches.</p>
          </div>
        )}

        {tutor && (
          <section className="card p-6 sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-semibold">Profil de tuteur</h2>
                <p className="text-sm text-earth-600">
                  Statut : {tutor.approved ? <span className="font-semibold text-forest-700">validé et visible</span> : <span className="font-semibold text-ochre-800">en attente de validation</span>}
                </p>
              </div>
              <Link href={`/tuteurs/${user.id}`} className="btn-outline">Voir mon profil public</Link>
            </div>
            <TutorProfileForm
              profile={{
                headline: tutor.headline,
                about: tutor.about,
                hourly_rate: tutor.hourly_rate,
                years_experience: tutor.years_experience,
                specialties: tutor.specialties,
                availability: tutor.availability,
                speaks: tutor.speaks,
              }}
              languages={languages.map((l) => ({ slug: l.slug, name: l.name })).sort((a, b) => a.name.localeCompare(b.name, "fr"))}
              levels={Object.fromEntries(tutor.languages.map((l) => [l.slug, l.level]))}
            />
          </section>
        )}

        <section className="card p-6 sm:p-8">
          <h2 className="mb-1 font-display text-2xl font-semibold">Informations du compte</h2>
          <p className="mb-6 text-sm text-earth-600">{account.email}</p>
          <AccountForm name={account.name} country={account.country} avatarUrl={account.avatar_url} />
        </section>

        <section className="card p-6 sm:p-8">
          <h2 className="mb-6 font-display text-2xl font-semibold">Sécurité</h2>
          <PasswordForm />
        </section>
      </div>
    </>
  );
}

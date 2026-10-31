import type { Metadata } from "next";
import { AccountForm } from "@/components/ProfileForms";
import { EspaceHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { first } from "@/lib/constants";
import { getUserProfile } from "@/lib/queries";

export const metadata: Metadata = { title: "Informations personnelles" };

export default async function ProfilePage({ searchParams }: PageProps<"/profil">) {
  const user = await requireUser("/profil");
  const welcome = first((await searchParams).bienvenue) === "1";
  const account = await getUserProfile(user.id);
  if (!account) return null;

  return (
    <>
      <EspaceHeader title="Informations personnelles">Votre nom, votre pays et votre photo.</EspaceHeader>
      {welcome && (
        <div className="mb-6 rounded-[1.5rem] bg-forest-100 p-5 text-forest-800">
          <p className="font-semibold">Bienvenue sur Riya !</p>
          <p className="mt-1 text-sm">Vérifiez votre pays de résidence : il détermine la devise et les moyens de paiement (mobile money, carte…) qui vous seront proposés.</p>
        </div>
      )}
      <AccountForm name={account.name} email={account.email} country={account.country} avatarUrl={account.avatar_url} />
    </>
  );
}

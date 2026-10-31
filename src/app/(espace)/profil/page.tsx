import type { Metadata } from "next";
import { AccountForm } from "@/components/ProfileForms";
import { EspaceHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getUserProfile } from "@/lib/queries";

export const metadata: Metadata = { title: "Informations personnelles" };

export default async function ProfilePage() {
  const user = await requireUser("/profil");
  const account = await getUserProfile(user.id);
  if (!account) return null;

  return (
    <>
      <EspaceHeader title="Informations personnelles">Votre nom, votre pays et votre photo.</EspaceHeader>
      <AccountForm name={account.name} email={account.email} country={account.country} avatarUrl={account.avatar_url} />
    </>
  );
}

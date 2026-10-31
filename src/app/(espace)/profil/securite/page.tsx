import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { PasswordForm } from "@/components/ProfileForms";
import { EspaceHeader, Panel } from "@/components/ui";
import { logout } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Sécurité" };

export default async function SecurityPage() {
  const user = await requireUser("/profil/securite");
  return (
    <>
      <EspaceHeader title="Sécurité">Protégez l&apos;accès à votre compte.</EspaceHeader>
      <div className="max-w-3xl space-y-6">
        <Panel title="Mot de passe" description={`Vous vous connectez avec ${user.email}.`}>
          <PasswordForm />
        </Panel>
        <Panel title="Session" description="Déconnectez-vous si vous utilisez un ordinateur partagé.">
          <form action={logout}><button className="btn-outline text-clay-700"><LogOut size={16} /> Se déconnecter</button></form>
        </Panel>
      </div>
    </>
  );
}

import { LogOut } from "lucide-react";
import { PasswordForm } from "@/components/ProfileForms";
import { EspaceHeader, Panel } from "@/components/ui";
import { defineMessages } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { logout } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

const M = defineMessages({
  en: {
    title: "Security", lead: "Protect access to your account.", password: "Password",
    login: (email: string, google: boolean) => `Login email: ${email}${google ? " · linked Google account" : ""}.`,
    session: "Session", sessionText: "Log out if you're using a shared computer.", logout: "Log out",
  },
  fr: {
    title: "Sécurité", lead: "Protégez l'accès à votre compte.", password: "Mot de passe",
    login: (email: string, google: boolean) => `Adresse de connexion : ${email}${google ? " · compte Google associé" : ""}.`,
    session: "Session", sessionText: "Déconnectez-vous si vous utilisez un ordinateur partagé.", logout: "Se déconnecter",
  },
});

export const generateMetadata = () => titled({ en: M.en.title, fr: M.fr.title });

export default async function SecurityPage() {
  const user = await requireUser("/profil/securite");
  const t = M[await getLocale()];
  const doc = await (await getDb()).users.findOne({ _id: user._id }, { projection: { passwordHash: 1, googleId: 1 } });
  return (
    <>
      <EspaceHeader title={t.title}>{t.lead}</EspaceHeader>
      <div className="max-w-3xl space-y-6">
        <Panel title={t.password} description={t.login(user.email, !!doc?.googleId)}>
          <PasswordForm hasPassword={!!doc?.passwordHash} />
        </Panel>
        <Panel title={t.session} description={t.sessionText}>
          <form action={logout}><button className="btn-outline text-clay-700"><LogOut size={16} /> {t.logout}</button></form>
        </Panel>
      </div>
    </>
  );
}

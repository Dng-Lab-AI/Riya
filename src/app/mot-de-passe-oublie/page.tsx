import Link from "next/link";
import { ForgotPasswordForm } from "@/components/AuthForms";
import { AuthShell } from "@/components/AuthShell";
import { defineMessages } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";

const M = defineMessages({
  en: { title: "Forgot your password?", subtitle: "Enter your email address and we'll send you a link to choose a new one.", remember: "Remembered it?", back: "Back to log in" },
  fr: { title: "Mot de passe oublié ?", subtitle: "Indiquez votre adresse : nous vous envoyons un lien pour en choisir un nouveau.", remember: "Vous vous en souvenez ?", back: "Retour à la connexion" },
});

export const generateMetadata = () => titled({ en: "Forgot password", fr: "Mot de passe oublié" });

export default async function ForgotPasswordPage() {
  const t = M[await getLocale()];
  return (
    <AuthShell
      title={t.title}
      subtitle={t.subtitle}
      footer={<>{t.remember} <Link href="/connexion" className="font-semibold text-clay-700 underline">{t.back}</Link></>}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}

import Link from "next/link";
import { ResetPasswordForm } from "@/components/AuthForms";
import { AuthShell } from "@/components/AuthShell";
import { defineMessages } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { first } from "@/lib/constants";

const M = defineMessages({
  en: { title: "Choose a new password", subtitle: "You'll be logged in right after, and logged out of your other devices.", newLink: "Request a new link" },
  fr: { title: "Choisissez un nouveau mot de passe", subtitle: "Vous serez connecté juste après, et déconnecté de vos autres appareils.", newLink: "Demander un nouveau lien" },
});

export const generateMetadata = () => titled({ en: "New password", fr: "Nouveau mot de passe" });

export default async function NewPasswordPage({ searchParams }: PageProps<"/mot-de-passe-oublie/nouveau">) {
  const token = first((await searchParams).token) ?? "";
  const t = M[await getLocale()];
  return (
    <AuthShell
      title={t.title}
      subtitle={t.subtitle}
      footer={<Link href="/mot-de-passe-oublie" className="font-semibold text-clay-700 underline">{t.newLink}</Link>}
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/AuthForms";
import { AuthShell } from "@/components/AuthShell";
import { defineMessages } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { first } from "@/lib/constants";
import { showGoogleButton } from "@/lib/google";

const M = defineMessages({
  en: { title: "Join Riya", subtitle: "Free, with no commitment. You only pay for the lessons you book.", already: "Already registered?", login: "Log in" },
  fr: { title: "Rejoignez Riya", subtitle: "Gratuit et sans engagement. Vous ne payez que les cours que vous réservez.", already: "Déjà inscrit ?", login: "Connectez-vous" },
});

export const generateMetadata = () => titled({ en: "Create an account", fr: "Créer un compte" });

export default async function RegisterPage({ searchParams }: PageProps<"/inscription">) {
  if (await getCurrentUser()) redirect("/tableau-de-bord");
  const sp = await searchParams;
  const suite = first(sp.suite);
  const t = M[await getLocale()];

  return (
    <AuthShell
      title={t.title}
      subtitle={t.subtitle}
      footer={<>{t.already} <Link href={`/connexion${suite ? `?suite=${encodeURIComponent(suite)}` : ""}`} className="font-semibold text-clay-700 underline">{t.login}</Link></>}
    >
      <RegisterForm suite={suite} defaultRole={first(sp.role) === "tuteur" ? "tutor" : "student"} google={showGoogleButton()} />
    </AuthShell>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/AuthForms";
import { AuthShell } from "@/components/AuthShell";
import { defineMessages } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { first } from "@/lib/constants";
import { showGoogleButton } from "@/lib/google";

const M = defineMessages<{ errors: Record<string, string>; title: string; subtitle: string; noAccount: string; signUp: string }>({
  en: {
    errors: {
      "google-indisponible": "Google sign-in isn't configured on this site yet (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET).",
      "google-annule": "Google sign-in was cancelled. Please try again.",
      "google-email": "Your Google account has no verified email address.",
      google: "Google sign-in failed. Please try again in a moment.",
      suspendu: "This account has been suspended. Please contact the Riya team.",
    },
    title: "Welcome back", subtitle: "Log in to find your lessons and messages.", noAccount: "No account yet?", signUp: "Sign up",
  },
  fr: {
    errors: {
      "google-indisponible": "La connexion avec Google n'est pas encore configurée sur ce site (GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET).",
      "google-annule": "La connexion avec Google a été annulée. Réessayez.",
      "google-email": "Votre compte Google n'a pas d'adresse e-mail vérifiée.",
      google: "La connexion avec Google a échoué. Réessayez dans un instant.",
      suspendu: "Ce compte a été suspendu. Contactez l'équipe Riya.",
    },
    title: "Bon retour parmi nous", subtitle: "Connectez-vous pour retrouver vos cours et vos messages.", noAccount: "Pas encore de compte ?", signUp: "Inscrivez-vous",
  },
});

export const generateMetadata = () => titled({ en: "Log in", fr: "Connexion" });

export default async function LoginPage({ searchParams }: PageProps<"/connexion">) {
  if (await getCurrentUser()) redirect("/tableau-de-bord");
  const sp = await searchParams;
  const suite = first(sp.suite);
  const t = M[await getLocale()];
  const error = t.errors[first(sp.erreur) ?? ""];

  return (
    <AuthShell
      title={t.title}
      subtitle={t.subtitle}
      footer={<>{t.noAccount} <Link href={`/inscription${suite ? `?suite=${encodeURIComponent(suite)}` : ""}`} className="font-semibold text-clay-700 underline">{t.signUp}</Link></>}
    >
      {error && <p role="alert" className="mb-5 rounded-xl bg-clay-50 px-4 py-3 text-sm font-medium text-clay-800">{error}</p>}
      <LoginForm suite={suite} google={showGoogleButton()} />
    </AuthShell>
  );
}

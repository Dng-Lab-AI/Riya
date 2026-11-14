import Link from "next/link";
import { MailCheck } from "lucide-react";
import { ResendVerificationForm } from "@/components/AuthForms";
import { AuthShell } from "@/components/AuthShell";
import { defineMessages } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { first } from "@/lib/constants";
import { isMailConfigured } from "@/lib/mail";

const M = defineMessages({
  en: {
    expiredTitle: "This link is no longer valid", title: "Check your inbox",
    expiredText: "It has expired or has already been used. Request a new one below.", text: "One last step before you start.",
    confirmed: "Email confirmed?", login: "Log in", notYet: "Your email address isn't confirmed yet.",
    sentTo: "We sent a confirmation link to", yourAddress: "your address",
    click: "Click it to activate your account: you'll be logged in automatically.",
    spam: "Nothing received? Check your spam or junk folder.",
    dev: "Development mode: no email sending is configured (RESEND_API_KEY). The confirmation link is shown in the terminal running",
  },
  fr: {
    expiredTitle: "Ce lien n'est plus valable", title: "Vérifiez votre boîte mail",
    expiredText: "Il a expiré ou a déjà servi. Demandez-en un nouveau ci-dessous.", text: "Une dernière étape avant de commencer.",
    confirmed: "Adresse confirmée ?", login: "Connectez-vous", notYet: "Votre adresse n'est pas encore confirmée.",
    sentTo: "Nous avons envoyé un lien de confirmation à", yourAddress: "votre adresse",
    click: "Cliquez dessus pour activer votre compte : vous serez connecté automatiquement.",
    spam: "Rien reçu ? Regardez dans vos spams ou courriers indésirables.",
    dev: "Mode développement : aucun envoi d'e-mail n'est configuré (RESEND_API_KEY). Le lien de confirmation est affiché dans le terminal où tourne",
  },
});

export const generateMetadata = () => titled({ en: "Confirm your email address", fr: "Confirmez votre adresse e-mail" });

export default async function CheckEmailPage({ searchParams }: PageProps<"/verifier-email">) {
  const sp = await searchParams;
  const email = first(sp.email) ?? "";
  const blocked = first(sp.bloque) === "1";
  const expired = first(sp.expire) === "1";
  const t = M[await getLocale()];

  return (
    <AuthShell
      title={expired ? t.expiredTitle : t.title}
      subtitle={expired ? t.expiredText : t.text}
      footer={<>{t.confirmed} <Link href="/connexion" className="font-semibold text-clay-700 underline">{t.login}</Link></>}
    >
      <div className="space-y-6">
        {!expired && (
          <div className="flex gap-4 rounded-2xl bg-forest-100 p-5 text-forest-800">
            <MailCheck size={28} className="shrink-0" />
            <div className="text-sm">
              {blocked && <p className="mb-2 font-semibold">{t.notYet}</p>}
              <p>
                {t.sentTo} <strong>{email || t.yourAddress}</strong>. {t.click}
              </p>
              <p className="mt-2 text-forest-700">{t.spam}</p>
            </div>
          </div>
        )}
        {!isMailConfigured() && process.env.NODE_ENV !== "production" && (
          <p className="rounded-2xl bg-ochre-100 p-4 text-sm text-ochre-800">
            {t.dev} <code>npm run dev</code>.
          </p>
        )}
        <ResendVerificationForm email={email} />
      </div>
    </AuthShell>
  );
}

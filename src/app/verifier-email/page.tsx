import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { ResendVerificationForm } from "@/components/AuthForms";
import { AuthShell } from "@/components/AuthShell";
import { first } from "@/lib/constants";
import { isMailConfigured } from "@/lib/mail";

export const metadata: Metadata = { title: "Confirmez votre adresse e-mail" };

export default async function CheckEmailPage({ searchParams }: PageProps<"/verifier-email">) {
  const sp = await searchParams;
  const email = first(sp.email) ?? "";
  const blocked = first(sp.bloque) === "1";
  const expired = first(sp.expire) === "1";

  return (
    <AuthShell
      title={expired ? "Ce lien n'est plus valable" : "Vérifiez votre boîte mail"}
      subtitle={expired ? "Il a expiré ou a déjà servi. Demandez-en un nouveau ci-dessous." : "Une dernière étape avant de commencer."}
      footer={<>Adresse confirmée ? <Link href="/connexion" className="font-semibold text-clay-700 underline">Connectez-vous</Link></>}
    >
      <div className="space-y-6">
        {!expired && (
          <div className="flex gap-4 rounded-2xl bg-forest-100 p-5 text-forest-800">
            <MailCheck size={28} className="shrink-0" />
            <div className="text-sm">
              {blocked && <p className="mb-2 font-semibold">Votre adresse n&apos;est pas encore confirmée.</p>}
              <p>
                Nous avons envoyé un lien de confirmation à <strong>{email || "votre adresse"}</strong>. Cliquez dessus pour activer votre compte : vous serez connecté automatiquement.
              </p>
              <p className="mt-2 text-forest-700">Rien reçu ? Regardez dans vos spams ou courriers indésirables.</p>
            </div>
          </div>
        )}
        {!isMailConfigured() && process.env.NODE_ENV !== "production" && (
          <p className="rounded-2xl bg-ochre-100 p-4 text-sm text-ochre-800">
            Mode développement : aucun serveur d&apos;e-mail n&apos;est configuré (SMTP_HOST). Le lien de confirmation est affiché dans le terminal où tourne <code>npm run dev</code>.
          </p>
        )}
        <ResendVerificationForm email={email} />
      </div>
    </AuthShell>
  );
}

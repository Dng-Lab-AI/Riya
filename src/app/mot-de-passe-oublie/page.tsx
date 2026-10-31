import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/AuthForms";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Mot de passe oublié ?"
      subtitle="Indiquez votre adresse : nous vous envoyons un lien pour en choisir un nouveau."
      footer={<>Vous vous en souvenez ? <Link href="/connexion" className="font-semibold text-clay-700 underline">Retour à la connexion</Link></>}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}

import { AccountForm } from "@/components/ProfileForms";
import { EspaceHeader } from "@/components/ui";
import { defineMessages } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { first } from "@/lib/constants";
import { getUserProfile } from "@/lib/queries";

const M = defineMessages({
  en: {
    title: "Personal details", lead: "Your name, your country and your photo.", welcome: "Welcome to Riya!",
    welcomeText: "Check your country of residence: it sets the currency and the payment methods (mobile money, card…) offered to you.",
  },
  fr: {
    title: "Informations personnelles", lead: "Votre nom, votre pays et votre photo.", welcome: "Bienvenue sur Riya !",
    welcomeText: "Vérifiez votre pays de résidence : il détermine la devise et les moyens de paiement (mobile money, carte…) qui vous seront proposés.",
  },
});

export const generateMetadata = () => titled({ en: M.en.title, fr: M.fr.title });

export default async function ProfilePage({ searchParams }: PageProps<"/profil">) {
  const user = await requireUser("/profil");
  const welcome = first((await searchParams).bienvenue) === "1";
  const [account, locale] = await Promise.all([getUserProfile(user.id), getLocale()]);
  if (!account) return null;
  const t = M[locale];

  return (
    <>
      <EspaceHeader title={t.title}>{t.lead}</EspaceHeader>
      {welcome && (
        <div className="mb-6 rounded-[1.5rem] bg-forest-100 p-5 text-forest-800">
          <p className="font-semibold">{t.welcome}</p>
          <p className="mt-1 text-sm">{t.welcomeText}</p>
        </div>
      )}
      <AccountForm name={account.name} email={account.email} country={account.country} avatarUrl={account.avatar_url} />
    </>
  );
}

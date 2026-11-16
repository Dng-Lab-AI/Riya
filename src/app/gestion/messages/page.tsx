import { MessagesSquare } from "lucide-react";
import { defineMessages } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";

const M = defineMessages({
  en: { select: "Select a conversation", lead: "Members' replies to the Riya team arrive here. To write to someone new, open their page in Members." },
  fr: { select: "Sélectionnez une conversation", lead: "Les réponses des membres à l'équipe Riya arrivent ici. Pour écrire à quelqu'un de nouveau, ouvrez sa fiche dans Membres." },
});

export const generateMetadata = () => titled({ en: "Messages", fr: "Messages" });

export default async function AdminMessagesPage() {
  await requireAdmin();
  const t = M[await getLocale()];
  return (
    <div className="pattern-bogolan flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sand-100 text-clay-600"><MessagesSquare size={30} /></span>
      <p className="font-display text-2xl font-semibold">{t.select}</p>
      <p className="max-w-sm text-earth-600">{t.lead}</p>
    </div>
  );
}

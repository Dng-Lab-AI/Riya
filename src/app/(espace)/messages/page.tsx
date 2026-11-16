import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { EnableNotifications } from "@/components/EnableNotifications";
import { defineMessages } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { requireUser } from "@/lib/auth";

const M = defineMessages({
  en: {
    select: "Select a conversation",
    tutor: "Choose a student on the left to read their messages and see where you stand together.",
    student: "Choose a tutor on the left to pick up the conversation, or contact a new one.",
    browse: "Browse tutors",
  },
  fr: {
    select: "Sélectionnez une conversation",
    tutor: "Choisissez un élève à gauche pour lire ses messages et voir où vous en êtes ensemble.",
    student: "Choisissez un tuteur à gauche pour reprendre la conversation, ou contactez-en un nouveau.",
    browse: "Parcourir les tuteurs",
  },
});

export const generateMetadata = () => titled({ en: "Messages", fr: "Messages" });

// Right column when no conversation is open (on a phone, only the contact list shows).
export default async function MessagesPage() {
  const user = await requireUser("/messages");
  const t = M[await getLocale()];

  return (
    <div className="pattern-bogolan flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sand-100 text-clay-600"><MessagesSquare size={30} /></span>
      <p className="font-display text-2xl font-semibold">{t.select}</p>
      <p className="max-w-sm text-earth-600">{user.role === "tutor" ? t.tutor : t.student}</p>
      <EnableNotifications />
      {user.role === "student" && <Link href="/tuteurs" className="btn-outline">{t.browse}</Link>}
    </div>
  );
}

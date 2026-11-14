import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { EnableNotifications } from "@/components/EnableNotifications";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Messages" };

// Right column when no conversation is open (on a phone, only the contact list shows).
export default async function MessagesPage() {
  const user = await requireUser("/messages");

  return (
    <div className="pattern-bogolan flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sand-100 text-clay-600"><MessagesSquare size={30} /></span>
      <p className="font-display text-2xl font-semibold">Sélectionnez une conversation</p>
      <p className="max-w-sm text-earth-600">
        {user.role === "tutor"
          ? "Choisissez un élève à gauche pour lire ses messages et voir où vous en êtes ensemble."
          : "Choisissez un tuteur à gauche pour reprendre la conversation, ou contactez-en un nouveau."}
      </p>
      <EnableNotifications />
      {user.role === "student" && <Link href="/tuteurs" className="btn-outline">Parcourir les tuteurs</Link>}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LocalDateTime } from "@/components/client";
import { MessageForm } from "@/components/CommunityForms";
import { Avatar } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { toIso } from "@/lib/constants";
import { toObjectId } from "@/lib/db";
import { getThread, getUserProfile, markThreadRead } from "@/lib/queries";

export const metadata: Metadata = { title: "Conversation" };

export default async function ThreadPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/messages/${id}`);
  const other = await getUserProfile(id);
  const otherId = toObjectId(id);
  if (!other || !otherId || other.id === user.id) notFound();

  await markThreadRead(user._id, otherId);
  const messages = await getThread(user._id, otherId);

  return (
    <div className="flex max-w-3xl flex-col">
      <div className="card flex items-center gap-3 p-4">
        <Link href="/messages" className="btn-ghost" aria-label="Retour"><ArrowLeft size={18} /></Link>
        <Avatar name={other.name} src={other.avatar_url} size={44} />
        <div>
          {other.role === "tutor" ? (
            <Link href={`/tuteurs/${other.id}`} className="font-semibold hover:text-clay-700">{other.name}</Link>
          ) : (
            <p className="font-semibold">{other.name}</p>
          )}
          <p className="text-xs text-earth-500">{other.role === "tutor" ? "Tuteur" : other.role === "admin" ? "Équipe Riya" : "Élève"}{other.country && ` · ${other.country}`}</p>
        </div>
      </div>

      <div className="pattern-bogolan my-4 flex min-h-[40vh] flex-col gap-3 rounded-2xl border border-sand-200 p-4">
        {messages.length === 0 && <p className="m-auto text-sm text-earth-500">Envoyez votre premier message à {other.name.split(" ")[0]}.</p>}
        {messages.map((m) => {
          const mine = m.sender_id === user.id;
          return (
            <div key={m.id} className={`max-w-[80%] ${mine ? "self-end" : "self-start"}`}>
              <div className={`whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm ${mine ? "rounded-br-sm bg-clay-600 text-white" : "rounded-bl-sm bg-white text-earth-900 shadow-sm"}`}>
                {m.body}
              </div>
              <p className={`mt-1 text-[11px] text-earth-500 ${mine ? "text-right" : ""}`}>
                <LocalDateTime iso={toIso(m.created_at)} />
              </p>
            </div>
          );
        })}
      </div>

      <MessageForm recipientId={other.id} />
    </div>
  );
}

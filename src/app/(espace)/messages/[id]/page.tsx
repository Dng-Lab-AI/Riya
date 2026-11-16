import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, ArrowLeft, CalendarPlus, ExternalLink } from "lucide-react";
import { LocalDateTime } from "@/components/client";
import { LiveThread } from "@/components/LiveThread";
import { ReportButton } from "@/components/ReportButton";
import { Avatar } from "@/components/ui";
import { defineMessages } from "@/i18n";
import { countryName } from "@/i18n/catalog";
import { getLocale, titled } from "@/i18n/server";
import { toggleArchive } from "@/lib/actions/community";
import { requireUser } from "@/lib/auth";
import { tutorStudentIds } from "@/lib/calendar";
import { getDb, toObjectId } from "@/lib/db";
import { getPairSummary } from "@/lib/inbox";
import { getThread, getUserProfile, markThreadRead } from "@/lib/queries";

const M = defineMessages<{
  roles: Record<string, string>; member: string; together: (n: number) => string; next: string; back: string;
  profile: string; schedule: string; unarchive: string; archive: string;
}>({
  en: {
    roles: { tutor: "Tutor", admin: "Riya team", student: "Student" }, member: "Member",
    together: (n) => `${n} lesson${n > 1 ? "s" : ""} together`, next: "next lesson", back: "Back to conversations",
    profile: "View profile", schedule: "Schedule a lesson", unarchive: "Unarchive", archive: "Archive the conversation",
  },
  fr: {
    roles: { tutor: "Tuteur", admin: "Équipe Riya", student: "Élève" }, member: "Membre",
    together: (n) => `${n} cours ensemble`, next: "prochain cours", back: "Retour aux conversations",
    profile: "Voir le profil", schedule: "Planifier un cours", unarchive: "Désarchiver", archive: "Archiver la conversation",
  },
});

export const generateMetadata = () => titled({ en: "Conversation", fr: "Conversation" });

export default async function ThreadPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/messages/${id}`);
  const other = await getUserProfile(id);
  const otherId = toObjectId(id);
  if (!other || !otherId || other.id === user.id) notFound();

  await markThreadRead(user._id, otherId);
  const [messages, summary, me, locale, students] = await Promise.all([
    getThread(user._id, otherId),
    getPairSummary(user._id, otherId),
    (await getDb()).users.findOne({ _id: user._id }, { projection: { archivedChats: 1 } }),
    getLocale(),
    user.role === "tutor" ? tutorStudentIds(user._id) : [],
  ]);
  // A tutor schedules lessons with their students, another tutor who books them included.
  const canSchedule = students.some((s) => s.equals(otherId));
  const t = M[locale];
  const archived = !!me?.archivedChats?.some((a) => a.equals(otherId));

  return (
    <>
      <header className="flex items-center gap-3 border-b border-sand-200 px-3 py-3 sm:px-4">
        <Link href="/messages" className="btn-ghost px-2 lg:hidden" aria-label={t.back}><ArrowLeft size={18} /></Link>
        <Avatar name={other.name} src={other.avatar_url} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{other.name}</p>
          <p className="truncate text-xs text-earth-500">
            {t.roles[other.role] ?? t.member}
            {other.country && ` · ${countryName(other.country, locale)}`}
            {summary.completed > 0 && ` · ${t.together(summary.completed)}`}
            {summary.next_at && <> · {t.next} <LocalDateTime iso={summary.next_at} /></>}
          </p>
        </div>
        {other.role === "tutor" && (
          <Link href={`/tuteurs/${other.id}`} className="btn-ghost px-2" title={t.profile} aria-label={t.profile}><ExternalLink size={18} /></Link>
        )}
        {canSchedule && (
          <Link href={`/calendrier?eleve=${other.id}`} className="btn-ghost px-2" title={t.schedule} aria-label={t.schedule}><CalendarPlus size={18} /></Link>
        )}
        <form action={toggleArchive.bind(null, other.id)}>
          <button className="btn-ghost px-2" title={archived ? t.unarchive : t.archive} aria-label={archived ? t.unarchive : t.archive}>
            {archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
          </button>
        </form>
        {other.role !== "admin" && <ReportButton targetId={other.id} name={other.name} compact />}
      </header>

      <LiveThread otherId={other.id} otherFirstName={other.name.split(" ")[0]} me={user.id} initial={messages} />
    </>
  );
}

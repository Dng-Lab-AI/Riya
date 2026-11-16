import { Megaphone } from "lucide-react";
import { AnnouncementForm } from "@/components/admin/OpsForms";
import { defineMessages } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { listAnnouncements } from "@/lib/admin-ops";
import { requireAdmin } from "@/lib/auth";
import { timeAgo } from "@/lib/constants";

const M = defineMessages({
  en: {
    title: "Announcements", lead: "Write to every student, every tutor, or everyone at once. The message arrives in their Riya messages, from the Riya team; they can reply there.",
    write: "New announcement", history: "Sent announcements", none: "No announcements sent yet.",
    audience: { all: "All members", students: "Students", tutors: "Tutors" } as Record<string, string>, recipients: (n: number) => `${n} recipient${n === 1 ? "" : "s"}`, emailed: "with e-mail",
  },
  fr: {
    title: "Annonces", lead: "Écrivez à tous les élèves, tous les tuteurs ou tout le monde à la fois. Le message arrive dans leurs messages Riya, de la part de l'équipe Riya ; ils peuvent y répondre.",
    write: "Nouvelle annonce", history: "Annonces envoyées", none: "Aucune annonce envoyée pour l'instant.",
    audience: { all: "Tous les membres", students: "Élèves", tutors: "Tuteurs" } as Record<string, string>, recipients: (n: number) => `${n} destinataire${n > 1 ? "s" : ""}`, emailed: "avec e-mail",
  },
});

export const generateMetadata = () => titled({ en: "Announcements", fr: "Annonces" });

export default async function AnnouncementsPage() {
  await requireAdmin();
  const locale = await getLocale();
  const t = M[locale];
  const announcements = await listAnnouncements();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold">{t.title}</h1>
        <p className="mt-1 text-earth-600">{t.lead}</p>
      </header>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <section className="card space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><Megaphone size={20} /> {t.write}</h2>
          <AnnouncementForm />
        </section>
        <section className="card space-y-3 p-5">
          <h2 className="font-display text-xl font-semibold">{t.history}</h2>
          {announcements.length ? (
            <ul className="space-y-4 text-sm">
              {announcements.map((a) => (
                <li key={a.id}>
                  <p className="text-xs text-earth-500">
                    {t.audience[a.audience]} · {t.recipients(a.recipients)}{a.emailed && ` · ${t.emailed}`} · {a.admin} · {timeAgo(a.at, locale)}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-earth-800">{a.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-earth-600">{t.none}</p>
          )}
        </section>
      </div>
    </div>
  );
}

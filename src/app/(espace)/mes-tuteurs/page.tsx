import Link from "next/link";
import { CalendarPlus, Heart, MessageCircle, Search } from "lucide-react";
import { LocalDateTime } from "@/components/client";
import { Avatar, EmptyState, EspaceHeader, Rating } from "@/components/ui";
import { defineMessages } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { formatPrice } from "@/lib/constants";
import { getFavoriteTutors, getStudentLessons, getTutorsByIds, type Lesson, type TutorSummary } from "@/lib/queries";

const M = defineMessages({
  en: {
    title: "My tutors", find: "Find a tutor", lead: "The tutors you learn with and your favourites: book a new lesson or write to them in one click.",
    none: "No tutors yet", noneText: "Add tutors to your favourites (the heart on their profile) or book a first lesson: they'll show up here.",
    browse: "Browse tutors", favorite: "Favourite", perLesson: "per lesson", together: "Lessons together", next: "Next lesson", last: "Last lesson",
    bookAgain: "Book again", book: "Book", write: "Write",
  },
  fr: {
    title: "Mes tuteurs", find: "Trouver un tuteur", lead: "Les tuteurs avec qui vous apprenez et vos favoris : réservez un nouveau cours ou écrivez-leur en un clic.",
    none: "Pas encore de tuteur", noneText: "Ajoutez des tuteurs à vos favoris (le cœur sur leur profil) ou réservez un premier cours : ils apparaîtront ici.",
    browse: "Parcourir les tuteurs", favorite: "Favori", perLesson: "le cours", together: "Cours ensemble", next: "Prochain cours", last: "Dernier cours",
    bookAgain: "Réserver à nouveau", book: "Réserver", write: "Écrire",
  },
});

export const generateMetadata = () => titled({ en: M.en.title, fr: M.fr.title });

type MyTutor = { tutor: TutorSummary; favorite: boolean; completed: number; next_at: string | null; last_at: string | null };

// Every tutor the student learnt with, plus their favourites, with what they did together.
function myTutors(lessons: Lesson[], tutors: TutorSummary[], favorites: Set<string>): MyTutor[] {
  const now = Date.now();
  return tutors
    .map((tutor) => {
      const mine = lessons.filter((l) => l.other_id === tutor.id);
      const next = mine.filter((l) => ["pending", "confirmed"].includes(l.status) && new Date(l.starts_at).getTime() > now).sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
      const last = mine.filter((l) => l.status === "completed").sort((a, b) => b.starts_at.localeCompare(a.starts_at))[0];
      return { tutor, favorite: favorites.has(tutor.id), completed: mine.filter((l) => l.status === "completed").length, next_at: next?.starts_at ?? null, last_at: last?.starts_at ?? null };
    })
    .sort((a, b) => (a.next_at ?? "9999").localeCompare(b.next_at ?? "9999") || b.completed - a.completed || Number(b.favorite) - Number(a.favorite));
}

export default async function MyTutorsPage() {
  const user = await requireUser("/mes-tuteurs");

  const [lessons, favorites, locale] = await Promise.all([getStudentLessons(user._id), getFavoriteTutors(user._id), getLocale()]);
  const t = M[locale];
  const favoriteIds = new Set(favorites.map((f) => f.id));
  const lessonTutorIds = [...new Set(lessons.filter((l) => l.status !== "cancelled").map((l) => l.other_id))].filter((id) => !favoriteIds.has(id));
  const tutors = myTutors(lessons, [...favorites, ...(await getTutorsByIds(lessonTutorIds))], favoriteIds);

  return (
    <>
      <EspaceHeader title={t.title} actions={<Link href="/tuteurs" className="btn-outline"><Search size={16} /> {t.find}</Link>}>
        {t.lead}
      </EspaceHeader>

      {tutors.length === 0 ? (
        <EmptyState title={t.none}>
          {t.noneText}
          <div className="mt-4"><Link href="/tuteurs" className="btn-primary">{t.browse}</Link></div>
        </EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {tutors.map(({ tutor, favorite, completed, next_at, last_at }) => (
            <li key={tutor.id} className="flex flex-col rounded-[1.75rem] border border-sand-200 bg-white p-5">
              <div className="flex items-start gap-4">
                <Avatar name={tutor.name} src={tutor.avatar_url} size={64} className="rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/tuteurs/${tutor.id}`} className="truncate font-display text-xl font-semibold hover:text-clay-700">{tutor.name}</Link>
                    {favorite && <Heart size={18} className="mt-1 shrink-0 fill-clay-600 text-clay-600" aria-label={t.favorite} />}
                  </div>
                  <p className="truncate text-sm text-earth-600">{tutor.languages.map((l) => l.name).join(", ")} · {formatPrice(tutor.hourly_rate, locale)} {t.perLesson}</p>
                  <div className="mt-1"><Rating value={tutor.rating} count={tutor.review_count} /></div>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-sand-50 p-3">
                  <dt className="text-earth-500">{t.together}</dt>
                  <dd className="font-display text-lg font-semibold">{completed}</dd>
                </div>
                <div className="rounded-2xl bg-sand-50 p-3">
                  <dt className="text-earth-500">{next_at ? t.next : t.last}</dt>
                  <dd className="font-semibold">{next_at ? <LocalDateTime iso={next_at} mode="date" /> : last_at ? <LocalDateTime iso={last_at} mode="date" /> : "—"}</dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/tuteurs/${tutor.id}#reserver`} className="btn-primary flex-1"><CalendarPlus size={16} /> {completed ? t.bookAgain : t.book}</Link>
                <Link href={`/messages/${tutor.id}`} className="btn-outline flex-1"><MessageCircle size={16} /> {t.write}</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

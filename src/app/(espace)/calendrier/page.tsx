import { redirect } from "next/navigation";
import { TutorCalendar } from "@/components/calendar/TutorCalendar";
import { EspaceHeader } from "@/components/ui";
import { getLocale, titled } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { getTutorCalendar } from "@/lib/calendar";
import { first } from "@/lib/constants";

export const generateMetadata = () => titled({ en: "Calendar", fr: "Calendrier" });

const DAY_MS = 24 * 60 * 60 * 1000;

// The week is chosen in the tutor's own time zone (Monday's date); the server loads a day more
// on each side so every time zone is covered. Without a date: the current week, wherever it falls.
function periodToLoad(week: RegExpExecArray | null): [Date, Date] {
  if (!week) return [new Date(Date.now() - 8 * DAY_MS), new Date(Date.now() + 8 * DAY_MS)];
  const monday = Date.UTC(Number(week[1]), Number(week[2]) - 1, Number(week[3]));
  return [new Date(monday - DAY_MS), new Date(monday + 8 * DAY_MS)];
}

export default async function CalendarPage({ searchParams }: PageProps<"/calendrier">) {
  const user = await requireUser("/calendrier");
  if (user.role !== "tutor") redirect("/tableau-de-bord");

  const sp = await searchParams;
  const week = /^(\d{4})-(\d{2})-(\d{2})$/.exec(first(sp.semaine));
  const [from, to] = periodToLoad(week);
  const [data, locale] = await Promise.all([getTutorCalendar(user._id, from, to), getLocale()]);

  return (
    <>
      <EspaceHeader title={locale === "en" ? "Calendar" : "Calendrier"}>
        {locale === "en"
          ? "Your lessons for the week, your availability, your time off and your extra slots. Click an hour to schedule a lesson."
          : "Vos cours de la semaine, vos disponibilités, vos absences et vos créneaux supplémentaires. Cliquez sur une heure pour planifier un cours."}
      </EspaceHeader>
      <TutorCalendar week={week ? week[0] : null} data={data} preselectStudent={first(sp.eleve)} />
    </>
  );
}

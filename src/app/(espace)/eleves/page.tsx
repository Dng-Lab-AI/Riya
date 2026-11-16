import { redirect } from "next/navigation";
import { StudentsTable } from "@/components/StudentsTable";
import { EspaceHeader } from "@/components/ui";
import { defineMessages } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { getTutorStudents } from "@/lib/students";

const M = defineMessages({
  en: {
    title: "My students",
    summary: (total: number, current: number) =>
      `${total} student${total > 1 ? "s" : ""} in total, ${current} of them current. Follow their lessons and keep everyone in the loop.`,
    empty: "Follow each student here: lessons taken, next lesson and what to do next.",
  },
  fr: {
    title: "Mes élèves",
    summary: (total: number, current: number) =>
      `${total} élève${total > 1 ? "s" : ""} au total, dont ${current} actuel${current > 1 ? "s" : ""}. Suivez leurs cours et ne laissez personne sans nouvelles.`,
    empty: "Suivez ici chaque élève : cours suivis, prochain cours et action à mener.",
  },
});

export const generateMetadata = () => titled({ en: M.en.title, fr: M.fr.title });

export default async function StudentsPage() {
  const user = await requireUser("/eleves");
  if (user.role !== "tutor") redirect("/tableau-de-bord");
  const [students, locale] = await Promise.all([getTutorStudents(user._id), getLocale()]);
  const t = M[locale];
  const current = students.filter((s) => s.current).length;

  return (
    <>
      <EspaceHeader title={t.title}>{students.length ? t.summary(students.length, current) : t.empty}</EspaceHeader>
      <StudentsTable students={students} />
    </>
  );
}

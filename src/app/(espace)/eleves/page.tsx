import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StudentsTable } from "@/components/StudentsTable";
import { EspaceHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getTutorStudents } from "@/lib/students";

export const metadata: Metadata = { title: "Mes élèves" };

export default async function StudentsPage() {
  const user = await requireUser("/eleves");
  if (user.role !== "tutor") redirect("/tableau-de-bord");
  const students = await getTutorStudents(user._id);
  const current = students.filter((s) => s.current).length;

  return (
    <>
      <EspaceHeader title="Mes élèves">
        {students.length
          ? `${students.length} élève${students.length > 1 ? "s" : ""} au total, dont ${current} actuel${current > 1 ? "s" : ""}. Suivez leurs cours et ne laissez personne sans nouvelles.`
          : "Suivez ici chaque élève : cours suivis, prochain cours et action à mener."}
      </EspaceHeader>
      <StudentsTable students={students} />
    </>
  );
}

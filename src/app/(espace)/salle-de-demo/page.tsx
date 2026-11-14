import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bot, FileText, ListChecks, MessagesSquare, MonitorUp, NotebookPen, PenLine, Video } from "lucide-react";
import { SubmitButton } from "@/components/client";
import { EspaceHeader } from "@/components/ui";
import { openDemoClassroom } from "@/lib/actions/demo";
import { requireUser } from "@/lib/auth";
import { DEMO_STUDENT_NAME } from "@/lib/constants";

export const metadata: Metadata = { title: "Salle de démo" };

const FEATURES = [
  { icon: Video, title: "Caméra et micro", text: "Vérifiez votre image, votre son et choisissez vos appareils avant d'entrer." },
  { icon: PenLine, title: "Tableau blanc", text: "Écrivez, dessinez et effacez, comme pendant un vrai cours." },
  { icon: FileText, title: "Documents", text: "Déposez un PDF, une image ou un audio et présentez-le en grand." },
  { icon: ListChecks, title: "Quiz éclair", text: "Lancez une question à choix multiples, ou faites-la proposer par l'IA." },
  { icon: NotebookPen, title: "Notes du cours", text: "Notez points clés, vocabulaire et devoirs : l'élève les voit en direct." },
  { icon: MessagesSquare, title: "Discussion", text: "Envoyez des messages écrits, des liens et des réactions." },
  { icon: MonitorUp, title: "Partage d'écran", text: "Montrez une page web ou une présentation." },
  { icon: Bot, title: "Assistant IA", text: "Activez les sous-titres et posez vos questions à l'assistant." },
];

// Practice classroom: the tutor can try every tool of the real classroom without a student.
export default async function DemoClassroomPage() {
  const user = await requireUser("/salle-de-demo");
  if (user.role !== "tutor") redirect("/tableau-de-bord");

  return (
    <>
      <EspaceHeader title="Salle de classe de démonstration">
        Entraînez-vous avant votre premier cours : la salle de démo fonctionne exactement comme une vraie classe,
        avec {DEMO_STUDENT_NAME.split(" ")[0]}, un élève fictif qui ne vous rejoindra pas.
      </EspaceHeader>

      <div className="overflow-hidden rounded-[1.75rem] bg-forest-900 text-sand-50">
        <div className="grid items-center gap-8 p-6 sm:p-10 md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ochre-300">Salle de démo</p>
            <h2 className="mt-2 font-display text-3xl font-semibold">Prêt·e à découvrir la classe ?</h2>
            <p className="mt-2 max-w-xl text-sand-200">
              Vous verrez d&apos;abord l&apos;aperçu de votre caméra, puis la salle complète. Rien de ce que vous faites ici
              n&apos;apparaît dans vos cours, vos statistiques ou vos revenus.
            </p>
          </div>
          <form action={openDemoClassroom}>
            <SubmitButton className="btn bg-ochre-400 px-7 py-3 text-base text-forest-900 hover:bg-ochre-300" pendingText="Ouverture…">
              <Video size={18} /> Entrer dans la salle de démo
            </SubmitButton>
          </form>
        </div>
      </div>

      <h2 className="mb-4 mt-10 font-display text-2xl font-semibold">Ce que vous pouvez essayer</h2>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-[1.5rem] border border-sand-200 bg-white p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-clay-50 text-clay-600"><Icon size={20} /></span>
            <p className="mt-3 font-semibold">{title}</p>
            <p className="mt-1 text-sm text-earth-600">{text}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

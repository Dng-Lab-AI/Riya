import { redirect } from "next/navigation";
import { Bot, FileText, ListChecks, MessagesSquare, MonitorUp, NotebookPen, PenLine, Video } from "lucide-react";
import { SubmitButton } from "@/components/client";
import { EspaceHeader } from "@/components/ui";
import { defineMessages } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { openDemoClassroom } from "@/lib/actions/demo";
import { requireUser } from "@/lib/auth";
import { DEMO_STUDENT_NAME } from "@/lib/constants";

const ICONS = [Video, PenLine, FileText, ListChecks, NotebookPen, MessagesSquare, MonitorUp, Bot];

const M = defineMessages({
  en: {
    features: [
      { title: "Camera and microphone", text: "Check your picture and sound and choose your devices before going in." },
      { title: "Whiteboard", text: "Write, draw and erase, just like in a real lesson." },
      { title: "Documents", text: "Upload a PDF, an image or an audio file and present it full size." },
      { title: "Quick quiz", text: "Launch a multiple-choice question, or let the AI suggest one." },
      { title: "Lesson notes", text: "Write key points, vocabulary and homework: the student sees them live." },
      { title: "Chat", text: "Send written messages, links and reactions." },
      { title: "Screen sharing", text: "Show a web page or a presentation." },
      { title: "AI assistant", text: "Turn on captions and ask the assistant your questions." },
    ],
    title: "Demo classroom",
    lead: (name: string) => `Practise before your first lesson: the demo room works exactly like a real class, with ${name}, a fictional student who won't join you.`,
    eyebrow: "Demo room", ready: "Ready to discover the classroom?",
    text: "You'll first see your camera preview, then the full room. Nothing you do here shows up in your lessons, statistics or earnings.",
    opening: "Opening…", enter: "Enter the demo room", tryTitle: "What you can try",
  },
  fr: {
    features: [
      { title: "Caméra et micro", text: "Vérifiez votre image, votre son et choisissez vos appareils avant d'entrer." },
      { title: "Tableau blanc", text: "Écrivez, dessinez et effacez, comme pendant un vrai cours." },
      { title: "Documents", text: "Déposez un PDF, une image ou un audio et présentez-le en grand." },
      { title: "Quiz éclair", text: "Lancez une question à choix multiples, ou faites-la proposer par l'IA." },
      { title: "Notes du cours", text: "Notez points clés, vocabulaire et devoirs : l'élève les voit en direct." },
      { title: "Discussion", text: "Envoyez des messages écrits, des liens et des réactions." },
      { title: "Partage d'écran", text: "Montrez une page web ou une présentation." },
      { title: "Assistant IA", text: "Activez les sous-titres et posez vos questions à l'assistant." },
    ],
    title: "Salle de classe de démonstration",
    lead: (name: string) => `Entraînez-vous avant votre premier cours : la salle de démo fonctionne exactement comme une vraie classe, avec ${name}, un élève fictif qui ne vous rejoindra pas.`,
    eyebrow: "Salle de démo", ready: "Prêt·e à découvrir la classe ?",
    text: "Vous verrez d'abord l'aperçu de votre caméra, puis la salle complète. Rien de ce que vous faites ici n'apparaît dans vos cours, vos statistiques ou vos revenus.",
    opening: "Ouverture…", enter: "Entrer dans la salle de démo", tryTitle: "Ce que vous pouvez essayer",
  },
});

export const generateMetadata = () => titled({ en: "Demo room", fr: "Salle de démo" });

// Practice classroom: the tutor can try every tool of the real classroom without a student.
export default async function DemoClassroomPage() {
  const user = await requireUser("/salle-de-demo");
  if (user.role !== "tutor") redirect("/tableau-de-bord");
  const locale = await getLocale();
  const t = M[locale];

  return (
    <>
      <EspaceHeader title={t.title}>{t.lead(DEMO_STUDENT_NAME[locale].split(" ")[0])}</EspaceHeader>

      <div className="overflow-hidden rounded-[1.75rem] bg-forest-900 text-sand-50">
        <div className="grid items-center gap-8 p-6 sm:p-10 md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ochre-300">{t.eyebrow}</p>
            <h2 className="mt-2 font-display text-3xl font-semibold">{t.ready}</h2>
            <p className="mt-2 max-w-xl text-sand-200">{t.text}</p>
          </div>
          <form action={openDemoClassroom}>
            <SubmitButton className="btn bg-ochre-400 px-7 py-3 text-base text-forest-900 hover:bg-ochre-300" pendingText={t.opening}>
              <Video size={18} /> {t.enter}
            </SubmitButton>
          </form>
        </div>
      </div>

      <h2 className="mb-4 mt-10 font-display text-2xl font-semibold">{t.tryTitle}</h2>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {t.features.map(({ title, text }, i) => {
          const Icon = ICONS[i];
          return (
            <li key={title} className="rounded-[1.5rem] border border-sand-200 bg-white p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-clay-50 text-clay-600"><Icon size={20} /></span>
              <p className="mt-3 font-semibold">{title}</p>
              <p className="mt-1 text-sm text-earth-600">{text}</p>
            </li>
          );
        })}
      </ul>
    </>
  );
}

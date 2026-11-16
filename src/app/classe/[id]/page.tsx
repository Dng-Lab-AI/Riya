import Link from "next/link";
import { notFound } from "next/navigation";
import { Classroom } from "@/components/Classroom";
import { LocalDateTime } from "@/components/client";
import { defineMessages } from "@/i18n";
import { getLocale, titled } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { classroomPhase, iceServers } from "@/lib/classroom";
import { BASE_SPEECH_LANGS, LESSON_STATUS, SPEECH_LANGS, lessonOf } from "@/lib/constants";
import { isAssistantAvailable } from "@/lib/assistant";
import { toObjectId } from "@/lib/db";
import { getClassroomLesson, getLessonFeedback, getLessonRecap } from "@/lib/queries";
import { getParticipantLesson } from "@/lib/classroom";

const M = defineMessages({
  en: {
    back: "Back to my lessons", status: (s: string) => `Lesson ${s.toLowerCase()}`,
    pending: "The classroom will open once the tutor has confirmed the lesson.", gone: "This lesson is no longer available in the classroom.",
    over: "This lesson is over", tookPlace: (lesson: string) => `Your ${lesson} took place on`,
    closes: "The room closes 30 minutes after the end of the lesson.",
    demo: (name: string) => `Demo room: ${name} is a fictional student and won't join you. Try every tool freely.`, leave: "Leave the demo",
  },
  fr: {
    back: "Retour à mes cours", status: (s: string) => `Cours ${s.toLowerCase()}`,
    pending: "La salle de classe ouvrira lorsque le tuteur aura confirmé le cours.", gone: "Ce cours n'est plus accessible en salle de classe.",
    over: "Ce cours est terminé", tookPlace: (lesson: string) => `Votre ${lesson.charAt(0).toLowerCase() + lesson.slice(1)} a eu lieu le`,
    closes: "La salle ferme 30 minutes après la fin du cours.",
    demo: (name: string) => `Salle de démonstration : ${name} est un élève fictif, il ne vous rejoindra pas. Testez librement tous les outils.`, leave: "Quitter la démo",
  },
});

export const generateMetadata = () => titled({ en: "Classroom", fr: "Salle de classe" });

function Notice({ title, back, children }: { title: string; back: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-forest-900 px-4 text-center text-sand-50">
      <div className="max-w-md">
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
        <div className="mt-3 text-sand-200">{children}</div>
        <Link href="/tableau-de-bord" className="btn mt-8 bg-ochre-400 text-forest-900 hover:bg-ochre-300">{back}</Link>
      </div>
    </div>
  );
}

export default async function ClassroomPage({ params }: PageProps<"/classe/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/classe/${id}`);
  const [lesson, locale] = await Promise.all([getClassroomLesson(id, user._id), getLocale()]);
  if (!lesson) notFound();
  const t = M[locale];

  const timing = { startsAt: new Date(lesson.starts_at), durationMinutes: lesson.duration_minutes, extraMinutes: lesson.extra_minutes, status: lesson.status };

  if (lesson.status !== "confirmed") {
    return (
      <Notice title={t.status(LESSON_STATUS[lesson.status].label[locale])} back={t.back}>
        {lesson.status === "pending" ? t.pending : t.gone}
      </Notice>
    );
  }

  const phase = classroomPhase(timing);
  if (phase !== "open") {
    return (
      <Notice title={t.over} back={t.back}>
        {t.tookPlace(lessonOf(lesson.language_name, locale))} <LocalDateTime iso={lesson.starts_at} />. {t.closes}
      </Notice>
    );
  }

  const room = (await getParticipantLesson(lesson.id, user._id))!;
  const [recap, feedback] = await Promise.all([getLessonRecap(room.lesson, user._id), getLessonFeedback(toObjectId(lesson.id)!)]);
  const speech = [...BASE_SPEECH_LANGS, ...(SPEECH_LANGS[room.lesson.languageSlug] ? [SPEECH_LANGS[room.lesson.languageSlug]] : [])];

  return (
    <>
    {lesson.demo && (
      <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-ochre-400 px-4 py-2 text-center text-sm font-semibold text-forest-900">
        {t.demo(lesson.other.name.split(" ")[0])}
        <Link href="/salle-de-demo" className="underline underline-offset-2">{t.leave}</Link>
      </p>
    )}
    <Classroom
      initialNotes={recap.notes}
      aiAvailable={isAssistantAvailable()}
      speechLangs={speech.map((s) => ({ code: s.code, label: s.label[locale] }))}
      initialFeedback={lesson.role === "student" ? feedback : null}
      lessonId={lesson.id}
      role={lesson.role}
      me={lesson.me}
      other={lesson.other}
      startsAt={lesson.starts_at}
      durationMinutes={lesson.duration_minutes}
      initialExtraMinutes={lesson.extra_minutes}
      languageName={lesson.language_name}
      iceServers={iceServers()}
    />
    </>
  );
}

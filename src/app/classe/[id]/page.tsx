import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Classroom } from "@/components/Classroom";
import { LocalDateTime } from "@/components/client";
import { requireUser } from "@/lib/auth";
import { classroomPhase, iceServers } from "@/lib/classroom";
import { BASE_SPEECH_LANGS, LESSON_STATUS, SPEECH_LANGS, withDe } from "@/lib/constants";
import { isAssistantAvailable } from "@/lib/assistant";
import { toObjectId } from "@/lib/db";
import { getClassroomLesson, getLessonFeedback, getLessonRecap } from "@/lib/queries";
import { getParticipantLesson } from "@/lib/classroom";

export const metadata: Metadata = { title: "Salle de classe" };

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-forest-900 px-4 text-center text-sand-50">
      <div className="max-w-md">
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
        <div className="mt-3 text-sand-200">{children}</div>
        <Link href="/tableau-de-bord" className="btn mt-8 bg-ochre-400 text-forest-900 hover:bg-ochre-300">Retour à mes cours</Link>
      </div>
    </div>
  );
}

export default async function ClassroomPage({ params }: PageProps<"/classe/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/classe/${id}`);
  const lesson = await getClassroomLesson(id, user._id);
  if (!lesson) notFound();

  const timing = { startsAt: new Date(lesson.starts_at), durationMinutes: lesson.duration_minutes, status: lesson.status };

  if (lesson.status !== "confirmed") {
    return (
      <Notice title={`Cours ${LESSON_STATUS[lesson.status].label.toLowerCase()}`}>
        {lesson.status === "pending" ? "La salle de classe ouvrira lorsque le tuteur aura confirmé le cours." : "Ce cours n'est plus accessible en salle de classe."}
      </Notice>
    );
  }

  const phase = classroomPhase(timing);
  if (phase !== "open") {
    return (
      <Notice title="Ce cours est terminé">
        Votre cours {withDe(lesson.language_name)} a eu lieu <LocalDateTime iso={lesson.starts_at} />.
        La salle ferme 30 minutes après la fin du cours.
      </Notice>
    );
  }

  const room = (await getParticipantLesson(lesson.id, user._id))!;
  const [recap, feedback] = await Promise.all([getLessonRecap(room.lesson, user._id), getLessonFeedback(toObjectId(lesson.id)!)]);

  return (
    <Classroom
      initialNotes={recap.notes}
      aiAvailable={isAssistantAvailable()}
      speechLangs={[...BASE_SPEECH_LANGS, ...(SPEECH_LANGS[room.lesson.languageSlug] ? [SPEECH_LANGS[room.lesson.languageSlug]] : [])]}
      initialFeedback={lesson.role === "student" ? feedback : null}
      lessonId={lesson.id}
      role={lesson.role}
      me={lesson.me}
      other={lesson.other}
      startsAt={lesson.starts_at}
      durationMinutes={lesson.duration_minutes}
      languageName={lesson.language_name}
      iceServers={iceServers()}
    />
  );
}

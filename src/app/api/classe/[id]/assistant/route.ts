import type { NextRequest } from "next/server";
import { defineMessages } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { askAssistant, draftQuiz, isAssistantAvailable } from "@/lib/assistant";
import { getCurrentUser } from "@/lib/auth";
import { getParticipantLesson, isClassroomOpen } from "@/lib/classroom";

const M = defineMessages({
  en: {
    signedOut: "Not logged in", notFound: "Lesson not found", closed: "The classroom is closed.",
    off: "The AI assistant isn't enabled on the platform yet.", ask: "Ask a question.",
    failed: "The assistant couldn't answer. Please try again in a moment.", invalid: "Invalid request",
  },
  fr: {
    signedOut: "Non connecté", notFound: "Cours introuvable", closed: "La salle de classe est fermée.",
    off: "L'assistant IA n'est pas encore activé sur la plateforme.", ask: "Posez une question.",
    failed: "L'assistant n'a pas pu répondre. Réessayez dans un instant.", invalid: "Requête invalide",
  },
});

// Questions to the AI assistant during the class, and quiz drafts for the tutor.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/classe/[id]/assistant">) {
  const locale = await getLocale();
  const t = M[locale];
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: t.signedOut }, { status: 401 });
  const room = await getParticipantLesson((await ctx.params).id, user._id);
  if (!room) return Response.json({ error: t.notFound }, { status: 404 });
  if (!isClassroomOpen(room.lesson)) return Response.json({ error: t.closed }, { status: 403 });
  if (!isAssistantAvailable()) return Response.json({ error: t.off }, { status: 503 });

  const input = (await request.json().catch(() => null)) as { kind?: string; question?: string } | null;
  try {
    if (input?.kind === "ask") {
      const question = String(input.question ?? "").trim().slice(0, 500);
      if (!question) return Response.json({ error: t.ask }, { status: 400 });
      return Response.json({ answer: await askAssistant(room.lesson, question, room.role === "tutor", locale) });
    }
    if (input?.kind === "quiz" && room.role === "tutor") {
      return Response.json({ quiz: await draftQuiz(room.lesson, locale) });
    }
  } catch (err) {
    console.error("AI assistant", err);
    return Response.json({ error: t.failed }, { status: 502 });
  }
  return Response.json({ error: t.invalid }, { status: 400 });
}

import type { NextRequest } from "next/server";
import { askAssistant, draftQuiz, isAssistantAvailable } from "@/lib/assistant";
import { getCurrentUser } from "@/lib/auth";
import { getParticipantLesson, isClassroomOpen } from "@/lib/classroom";

// Questions to the AI assistant during the class, and quiz drafts for the tutor.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/classe/[id]/assistant">) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Non connecté" }, { status: 401 });
  const room = await getParticipantLesson((await ctx.params).id, user._id);
  if (!room) return Response.json({ error: "Cours introuvable" }, { status: 404 });
  if (!isClassroomOpen(room.lesson)) return Response.json({ error: "La salle de classe est fermée." }, { status: 403 });
  if (!isAssistantAvailable()) return Response.json({ error: "L'assistant IA n'est pas encore activé sur la plateforme." }, { status: 503 });

  const input = (await request.json().catch(() => null)) as { kind?: string; question?: string } | null;
  try {
    if (input?.kind === "ask") {
      const question = String(input.question ?? "").trim().slice(0, 500);
      if (!question) return Response.json({ error: "Posez une question." }, { status: 400 });
      return Response.json({ answer: await askAssistant(room.lesson, question, room.role === "tutor") });
    }
    if (input?.kind === "quiz" && room.role === "tutor") {
      return Response.json({ quiz: await draftQuiz(room.lesson) });
    }
  } catch (err) {
    console.error("Assistant IA", err);
    return Response.json({ error: "L'assistant n'a pas pu répondre. Réessayez dans un instant." }, { status: 502 });
  }
  return Response.json({ error: "Requête invalide" }, { status: 400 });
}

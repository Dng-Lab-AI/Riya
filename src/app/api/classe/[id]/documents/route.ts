import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getParticipantLesson } from "@/lib/classroom";
import { toObjectId } from "@/lib/db";
import { deleteLessonFile, findLessonFile, listLessonFiles, saveLessonFile, validateLessonFile } from "@/lib/documents";

// Upload (tutor) and list documents shared in a lesson.

async function tutorRoom(ctx: RouteContext<"/api/classe/[id]/documents">) {
  const user = await getCurrentUser();
  if (!user) return { error: Response.json({ error: "Non connecté" }, { status: 401 }) };
  const room = await getParticipantLesson((await ctx.params).id, user._id);
  if (!room) return { error: Response.json({ error: "Cours introuvable" }, { status: 404 }) };
  return { user, room };
}

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/classe/[id]/documents">) {
  const access = await tutorRoom(ctx);
  if (access.error) return access.error;
  return Response.json({ documents: await listLessonFiles(access.room.lesson._id) });
}

export async function POST(request: NextRequest, ctx: RouteContext<"/api/classe/[id]/documents">) {
  const access = await tutorRoom(ctx);
  if (access.error) return access.error;
  const { user, room } = access;
  if (room.role !== "tutor") return Response.json({ error: "Seul le tuteur peut partager des documents." }, { status: 403 });
  if (room.lesson.status === "cancelled") return Response.json({ error: "Ce cours est annulé." }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Aucun fichier reçu." }, { status: 400 });
  const invalid = validateLessonFile(file);
  if (invalid) return Response.json({ error: invalid }, { status: 400 });

  const id = await saveLessonFile(file, room.lesson._id, user._id);
  return Response.json({ id: id.toHexString() }, { status: 201 });
}

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/classe/[id]/documents">) {
  const access = await tutorRoom(ctx);
  if (access.error) return access.error;
  if (access.room.role !== "tutor") return Response.json({ error: "Seul le tuteur peut retirer un document." }, { status: 403 });
  const fileId = toObjectId(request.nextUrl.searchParams.get("fichier"));
  const found = fileId && (await findLessonFile(fileId));
  if (!found || !found.meta.lessonId.equals(access.room.lesson._id)) return Response.json({ error: "Document introuvable" }, { status: 404 });
  await deleteLessonFile(fileId);
  return Response.json({ ok: true });
}

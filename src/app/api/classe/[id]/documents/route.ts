import type { NextRequest } from "next/server";
import { defineMessages } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { getParticipantLesson } from "@/lib/classroom";
import { toObjectId } from "@/lib/db";
import { deleteLessonFile, findLessonFile, listLessonFiles, saveLessonFile, validateLessonFile } from "@/lib/documents";

const M = defineMessages({
  en: {
    signedOut: "Not logged in", notFound: "Lesson not found", tutorShares: "Only the tutor can share documents.",
    cancelled: "This lesson is cancelled.", noFile: "No file received.", tutorRemoves: "Only the tutor can remove a document.",
    docNotFound: "Document not found",
  },
  fr: {
    signedOut: "Non connecté", notFound: "Cours introuvable", tutorShares: "Seul le tuteur peut partager des documents.",
    cancelled: "Ce cours est annulé.", noFile: "Aucun fichier reçu.", tutorRemoves: "Seul le tuteur peut retirer un document.",
    docNotFound: "Document introuvable",
  },
});

// Upload (tutor) and list documents shared in a lesson.

async function tutorRoom(ctx: RouteContext<"/api/classe/[id]/documents">) {
  const locale = await getLocale();
  const t = M[locale];
  const user = await getCurrentUser();
  if (!user) return { error: Response.json({ error: t.signedOut }, { status: 401 }) };
  const room = await getParticipantLesson((await ctx.params).id, user._id);
  if (!room) return { error: Response.json({ error: t.notFound }, { status: 404 }) };
  return { user, room, locale, t };
}

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/classe/[id]/documents">) {
  const access = await tutorRoom(ctx);
  if (access.error) return access.error;
  return Response.json({ documents: await listLessonFiles(access.room.lesson._id) });
}

export async function POST(request: NextRequest, ctx: RouteContext<"/api/classe/[id]/documents">) {
  const access = await tutorRoom(ctx);
  if (access.error) return access.error;
  const { user, room, t } = access;
  if (room.role !== "tutor") return Response.json({ error: t.tutorShares }, { status: 403 });
  if (room.lesson.status === "cancelled") return Response.json({ error: t.cancelled }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: t.noFile }, { status: 400 });
  const invalid = validateLessonFile(file, access.locale);
  if (invalid) return Response.json({ error: invalid }, { status: 400 });

  const id = await saveLessonFile(file, room.lesson._id, user._id);
  return Response.json({ id: id.toHexString() }, { status: 201 });
}

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/classe/[id]/documents">) {
  const access = await tutorRoom(ctx);
  if (access.error) return access.error;
  if (access.room.role !== "tutor") return Response.json({ error: access.t.tutorRemoves }, { status: 403 });
  const fileId = toObjectId(request.nextUrl.searchParams.get("fichier"));
  const found = fileId && (await findLessonFile(fileId));
  if (!found || !found.meta.lessonId.equals(access.room.lesson._id)) return Response.json({ error: access.t.docNotFound }, { status: 404 });
  await deleteLessonFile(fileId);
  return Response.json({ ok: true });
}

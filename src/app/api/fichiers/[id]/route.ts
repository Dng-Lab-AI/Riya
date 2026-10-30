import { Readable } from "node:stream";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getParticipantLesson } from "@/lib/classroom";
import { getDb, toObjectId } from "@/lib/db";
import { findLessonFile } from "@/lib/documents";

// Serves a lesson document to the lesson's two participants only.
// Add ?telecharger=1 to download instead of opening it in the browser.
export async function GET(request: NextRequest, ctx: RouteContext<"/api/fichiers/[id]">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Non connecté", { status: 401 });
  const fileId = toObjectId((await ctx.params).id);
  const found = fileId && (await findLessonFile(fileId));
  if (!found || !(await getParticipantLesson(found.meta.lessonId.toHexString(), user._id))) {
    return new Response("Document introuvable", { status: 404 });
  }

  const db = await getDb();
  const stream = Readable.toWeb(db.files.openDownloadStream(fileId)) as ReadableStream;
  const disposition = request.nextUrl.searchParams.has("telecharger") ? "attachment" : "inline";
  return new Response(stream, {
    headers: {
      "Content-Type": found.meta.contentType,
      "Content-Length": String(found.file.length),
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(found.file.filename)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
    },
  });
}

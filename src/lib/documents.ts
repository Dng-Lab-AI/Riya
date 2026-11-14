import "server-only";
import { Readable } from "node:stream";
import type { Locale } from "@/i18n";
import { LESSON_FILE_MAX_BYTES, LESSON_FILE_TYPES } from "./constants";
import { getDb, type LessonFileMeta, type ObjectId } from "./db";

// Documents shared in a lesson, stored in MongoDB GridFS (bucket "lesson_files").

export type LessonFile = { id: string; name: string; content_type: string; size: number; uploaded_at: string };

export async function listLessonFiles(lessonId: ObjectId): Promise<LessonFile[]> {
  const db = await getDb();
  const files = await db.files.find({ "metadata.lessonId": lessonId }).sort({ uploadDate: 1 }).toArray();
  return files.map((f) => ({
    id: f._id.toHexString(),
    name: f.filename,
    content_type: (f.metadata as LessonFileMeta | undefined)?.contentType ?? "application/octet-stream",
    size: f.length,
    uploaded_at: f.uploadDate.toISOString(),
  }));
}

const FILE_ERRORS: Record<Locale, { type: string; size: string; empty: string }> = {
  en: {
    type: "File type not accepted (PDF, images, audio, Word, PowerPoint, Excel or text).",
    size: "File too large (15 MB maximum).",
    empty: "The file is empty.",
  },
  fr: {
    type: "Type de fichier non accepté (PDF, images, audio, Word, PowerPoint, Excel ou texte).",
    size: "Fichier trop volumineux (15 Mo maximum).",
    empty: "Le fichier est vide.",
  },
};

export function validateLessonFile(file: File, locale: Locale): string | null {
  const t = FILE_ERRORS[locale];
  if (!LESSON_FILE_TYPES[file.type]) return t.type;
  if (file.size > LESSON_FILE_MAX_BYTES) return t.size;
  if (file.size === 0) return t.empty;
  return null;
}

export async function saveLessonFile(file: File, lessonId: ObjectId, uploaderId: ObjectId): Promise<ObjectId> {
  const db = await getDb();
  const name = file.name.replace(/[\/\r\n]/g, "_").slice(0, 160) || "document";
  const metadata: LessonFileMeta = { lessonId, uploaderId, contentType: file.type };
  const upload = db.files.openUploadStream(name, { metadata });
  await new Promise<void>((resolve, reject) => {
    Readable.fromWeb(file.stream() as import("node:stream/web").ReadableStream).pipe(upload).on("finish", () => resolve()).on("error", reject);
  });
  return upload.id as ObjectId;
}

export async function findLessonFile(fileId: ObjectId) {
  const db = await getDb();
  const file = await db.files.find({ _id: fileId }).next();
  return file ? { file, meta: file.metadata as LessonFileMeta } : null;
}

export async function readLessonFile(fileId: ObjectId): Promise<Buffer> {
  const db = await getDb();
  const chunks: Buffer[] = [];
  for await (const chunk of db.files.openDownloadStream(fileId)) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

export async function deleteLessonFile(fileId: ObjectId) {
  const db = await getDb();
  await db.files.delete(fileId);
  await db.lessons.updateMany({ presentedFileId: fileId }, { $set: { presentedFileId: null } });
}

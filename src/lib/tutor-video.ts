import "server-only";
import { Readable } from "node:stream";
import { TUTOR_VIDEO_MAX_BYTES, TUTOR_VIDEO_MAX_SECONDS, TUTOR_VIDEO_TYPES } from "./constants";
import { getDb, type ObjectId, type TutorVideo } from "./db";

// Tutors' presentation videos, stored in MongoDB GridFS (bucket "tutor_videos"), or a YouTube link.

export function validateTutorVideo(file: File, seconds: number): string | null {
  if (!TUTOR_VIDEO_TYPES.includes(file.type)) return "Format non accepté : envoyez une vidéo MP4, WebM ou MOV.";
  if (file.size === 0) return "Le fichier est vide.";
  if (file.size > TUTOR_VIDEO_MAX_BYTES) return `Vidéo trop lourde (${Math.round(TUTOR_VIDEO_MAX_BYTES / 1024 / 1024)} Mo maximum). Filmez en 720p ou raccourcissez-la.`;
  // Measured by the browser before sending; the size limit above is the server's safety net.
  if (Number.isFinite(seconds) && seconds > TUTOR_VIDEO_MAX_SECONDS + 1) return `Vidéo trop longue : ${TUTOR_VIDEO_MAX_SECONDS / 60} minutes maximum.`;
  return null;
}

async function deleteUploadedVideo(video: TutorVideo | undefined) {
  if (video?.kind !== "upload") return;
  const db = await getDb();
  await db.videos.delete(video.fileId).catch(() => {});
}

// Replaces the tutor's video by the uploaded file.
export async function saveTutorVideo(tutorId: ObjectId, file: File) {
  const db = await getDb();
  const previous = (await db.users.findOne({ _id: tutorId }, { projection: { "tutor.video": 1 } }))?.tutor?.video;
  const upload = db.videos.openUploadStream(file.name.replace(/[\/\r\n]/g, "_").slice(0, 120) || "presentation", {
    metadata: { tutorId, contentType: file.type },
  });
  await new Promise<void>((resolve, reject) => {
    Readable.fromWeb(file.stream() as import("node:stream/web").ReadableStream).pipe(upload).on("finish", () => resolve()).on("error", reject);
  });
  const video: TutorVideo = { kind: "upload", fileId: upload.id as ObjectId, contentType: file.type };
  await db.users.updateOne({ _id: tutorId, role: "tutor" }, { $set: { "tutor.video": video } });
  await deleteUploadedVideo(previous);
}

export async function setTutorYoutubeVideo(tutorId: ObjectId, youtubeId: string) {
  const db = await getDb();
  const previous = (await db.users.findOne({ _id: tutorId }, { projection: { "tutor.video": 1 } }))?.tutor?.video;
  await db.users.updateOne({ _id: tutorId, role: "tutor" }, { $set: { "tutor.video": { kind: "youtube", youtubeId } } });
  await deleteUploadedVideo(previous);
}

export async function removeTutorVideo(tutorId: ObjectId) {
  const db = await getDb();
  const previous = (await db.users.findOne({ _id: tutorId }, { projection: { "tutor.video": 1 } }))?.tutor?.video;
  await db.users.updateOne({ _id: tutorId }, { $unset: { "tutor.video": "" } });
  await deleteUploadedVideo(previous);
}

// What the pages need to play the video.
export type VideoView = { kind: "upload"; url: string } | { kind: "youtube"; embed: string } | null;

export function videoView(video: TutorVideo | undefined): VideoView {
  if (!video) return null;
  if (video.kind === "youtube") return { kind: "youtube", embed: `https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0` };
  return { kind: "upload", url: `/api/videos/${video.fileId.toHexString()}` };
}

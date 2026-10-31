import "server-only";
import { getDb, toObjectId, type LessonDoc, type ObjectId } from "./db";

// A confirmed lesson's classroom can be joined at any time, even before the start,
// and closes 30 minutes after its end. In development it never closes, so it can be tried at any time.
const CLOSES_AFTER_MS = 30 * 60 * 1000;

export function classroomClosesAt(lesson: Pick<LessonDoc, "startsAt" | "durationMinutes">) {
  return new Date(lesson.startsAt.getTime() + lesson.durationMinutes * 60 * 1000 + CLOSES_AFTER_MS);
}

export function isClassroomOpen(lesson: Pick<LessonDoc, "startsAt" | "durationMinutes" | "status">, now = Date.now()) {
  if (lesson.status !== "confirmed") return false;
  if (process.env.NODE_ENV !== "production") return true;
  return now <= classroomClosesAt(lesson).getTime();
}

// STUN lets peers discover their public address; a TURN relay is needed when
// both sides are behind strict NATs (some mobile and corporate networks).
export function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: (process.env.STUN_URLS ?? "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302").split(",") }];
  if (process.env.TURN_URLS) {
    servers.push({ urls: process.env.TURN_URLS.split(","), username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
  }
  return servers;
}

export function classroomPhase(lesson: Pick<LessonDoc, "startsAt" | "durationMinutes" | "status">): "open" | "over" | "closed" {
  if (lesson.status !== "confirmed") return "closed";
  return isClassroomOpen(lesson) ? "open" : "over";
}

// The lesson, if the user is its student or tutor.
export async function getParticipantLesson(lessonId: string, userId: ObjectId) {
  const _id = toObjectId(lessonId);
  if (!_id) return null;
  const db = await getDb();
  const lesson = await db.lessons.findOne({ _id, $or: [{ studentId: userId }, { tutorId: userId }] });
  if (!lesson) return null;
  const role: "student" | "tutor" = lesson.tutorId.equals(userId) ? "tutor" : "student";
  return { lesson, role, otherId: role === "tutor" ? lesson.studentId : lesson.tutorId };
}

export function hasStarted(lesson: Pick<LessonDoc, "startsAt">) {
  return lesson.startsAt.getTime() <= Date.now();
}

// A session can be rated and summarised once it has taken place (any time in development).
export function sessionHappened(lesson: Pick<LessonDoc, "startsAt" | "status">) {
  if (lesson.status === "completed") return true;
  return lesson.status === "confirmed" && (hasStarted(lesson) || process.env.NODE_ENV !== "production");
}

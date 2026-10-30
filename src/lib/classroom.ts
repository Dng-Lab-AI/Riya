import "server-only";
import { getDb, toObjectId, type LessonDoc, type ObjectId } from "./db";

// The classroom opens 15 minutes before the lesson and closes 30 minutes after its end.
// In development it is always open for confirmed lessons, so it can be tried at any time.
const OPENS_BEFORE_MS = 15 * 60 * 1000;
const CLOSES_AFTER_MS = 30 * 60 * 1000;

export function classroomWindow(lesson: Pick<LessonDoc, "startsAt" | "durationMinutes">) {
  const start = lesson.startsAt.getTime();
  return {
    opensAt: new Date(start - OPENS_BEFORE_MS),
    closesAt: new Date(start + lesson.durationMinutes * 60 * 1000 + CLOSES_AFTER_MS),
  };
}

export function isClassroomOpen(lesson: Pick<LessonDoc, "startsAt" | "durationMinutes" | "status">, now = Date.now()) {
  if (lesson.status !== "confirmed") return false;
  if (process.env.NODE_ENV !== "production") return true;
  const { opensAt, closesAt } = classroomWindow(lesson);
  return now >= opensAt.getTime() && now <= closesAt.getTime();
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

export function classroomPhase(lesson: Pick<LessonDoc, "startsAt" | "durationMinutes" | "status">): "open" | "early" | "over" | "closed" {
  if (lesson.status !== "confirmed") return "closed";
  if (isClassroomOpen(lesson)) return "open";
  return classroomWindow(lesson).opensAt.getTime() > Date.now() ? "early" : "over";
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

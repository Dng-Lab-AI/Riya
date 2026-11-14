"use server";

import { redirect } from "next/navigation";
import { requireUser } from "../auth";
import { getDb, ObjectId } from "../db";

// Opens the tutor's practice classroom: a lesson with a fictional student that is always
// open, so the tutor can try the camera, whiteboard, documents, quizzes and notes.
// Each visit starts from a clean room (chat, board and quiz are reset; documents are kept).
export async function openDemoClassroom() {
  const user = await requireUser("/salle-de-demo");
  if (user.role !== "tutor") redirect("/tableau-de-bord");

  const db = await getDb();
  const tutor = await db.users.findOne({ _id: user._id }, { projection: { "tutor.languages": 1 } });
  const languageSlug = tutor?.tutor?.languages[0]?.slug ?? "swahili";
  const now = new Date();

  const existing = await db.lessons.findOne({ tutorId: user._id, demo: true });
  const _id = existing?._id ?? new ObjectId();
  if (existing) {
    await Promise.all([
      db.lessons.updateOne(
        { _id },
        {
          $set: { startsAt: now, status: "confirmed", languageSlug, boardOpen: false, hands: {}, liveQuiz: null, quizzes: [], presentedFileId: null, presence: {} },
          $unset: { assistant: "", notes: "", summary: "", summaryStatus: "" },
        },
      ),
      db.classChat.deleteMany({ lessonId: _id }),
      db.events.deleteMany({ lessonId: _id }),
      db.signals.deleteMany({ lessonId: _id }),
      db.transcript.deleteMany({ lessonId: _id }),
    ]);
  } else {
    await db.lessons.insertOne({
      _id, studentId: new ObjectId(), tutorId: user._id, languageSlug, startsAt: now, durationMinutes: 50, price: 0,
      status: "confirmed", message: "", demo: true, createdAt: now,
    });
  }
  redirect(`/classe/${_id.toHexString()}`);
}

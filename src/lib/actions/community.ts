"use server";

import { redirect } from "next/navigation";
import { defineMessages } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { requireUser } from "../auth";
import { FORUM_CATEGORIES } from "../constants";
import { getDb, ObjectId, toObjectId } from "../db";
import { refreshAll, text, type FormState } from "./shared";

const M = defineMessages({
  en: {
    empty: "The message is empty.", recipient: "Invalid recipient.", unavailable: "This member is no longer available.",
    title: "The title must be at least 8 characters long.", body: "Describe your question in at least 20 characters.", category: "Choose a category.",
    reply: "Your reply is empty.", gone: "This topic no longer exists.",
  },
  fr: {
    empty: "Le message est vide.", recipient: "Destinataire invalide.", unavailable: "Ce membre n'est plus disponible.",
    title: "Le titre doit faire au moins 8 caractères.", body: "Détaillez votre question en au moins 20 caractères.", category: "Choisissez une catégorie.",
    reply: "Votre réponse est vide.", gone: "Ce sujet n'existe plus.",
  },
});

export async function sendMessage(recipientId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(`/messages/${recipientId}`);
  const body = text(formData, "body", 4000);
  const to = toObjectId(recipientId);
  const t = M[await getLocale()];
  if (!body) return { error: t.empty };
  if (!to || to.equals(user._id)) return { error: t.recipient };

  const db = await getDb();
  if (!(await db.users.countDocuments({ _id: to, status: "active" }))) return { error: t.unavailable };
  await db.messages.insertOne({ _id: new ObjectId(), senderId: user._id, recipientId: to, body, readAt: null, createdAt: new Date() });
  // A new message brings an archived conversation back to the main list, on both sides.
  await Promise.all([
    db.users.updateOne({ _id: user._id }, { $pull: { archivedChats: to } }),
    db.users.updateOne({ _id: to }, { $pull: { archivedChats: user._id } }),
  ]);
  refreshAll();
  return { success: "sent" };
}

// "Archive" / "Unarchive" a conversation (only for the viewer).
export async function toggleArchive(otherId: string) {
  const user = await requireUser("/messages");
  const other = toObjectId(otherId);
  if (!other) return;
  const db = await getDb();
  const removed = await db.users.updateOne({ _id: user._id, archivedChats: other }, { $pull: { archivedChats: other } });
  if (!removed.modifiedCount) await db.users.updateOne({ _id: user._id }, { $addToSet: { archivedChats: other } });
  refreshAll();
}

export async function createTopic(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/forum/nouveau");
  const title = text(formData, "title", 160);
  const body = text(formData, "body", 8000);
  const category = text(formData, "category", 40);
  const languageSlug = text(formData, "language", 40);

  const t = M[await getLocale()];
  if (title.length < 8) return { error: t.title };
  if (body.length < 20) return { error: t.body };
  if (!FORUM_CATEGORIES.some((c) => c.value === category)) return { error: t.category };

  const db = await getDb();
  const language = languageSlug ? await db.languages.findOne({ slug: languageSlug }) : null;
  const _id = new ObjectId();
  await db.topics.insertOne({ _id, authorId: user._id, category, languageSlug: language?.slug ?? null, title, body, views: 0, createdAt: new Date() });

  refreshAll();
  redirect(`/forum/${_id.toHexString()}`);
}

export async function replyToTopic(topicId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(`/forum/${topicId}`);
  const body = text(formData, "body", 8000);
  const t = M[await getLocale()];
  if (body.length < 2) return { error: t.reply };

  const _id = toObjectId(topicId);
  const db = await getDb();
  if (!_id || !(await db.topics.countDocuments({ _id }))) return { error: t.gone };
  await db.replies.insertOne({ _id: new ObjectId(), topicId: _id, authorId: user._id, body, createdAt: new Date() });
  refreshAll();
  return { success: "sent" };
}

// Authors and admins can remove forum content.
export async function deleteTopic(topicId: string) {
  const user = await requireUser("/forum");
  const _id = toObjectId(topicId);
  const db = await getDb();
  const topic = _id && (await db.topics.findOne({ _id }));
  if (topic && (topic.authorId.equals(user._id) || user.role === "admin")) {
    await db.topics.deleteOne({ _id: topic._id });
    await db.replies.deleteMany({ topicId: topic._id });
  }
  refreshAll();
  redirect("/forum");
}

export async function deleteReply(replyId: string) {
  const user = await requireUser("/forum");
  const _id = toObjectId(replyId);
  const db = await getDb();
  const reply = _id && (await db.replies.findOne({ _id }));
  if (reply && (reply.authorId.equals(user._id) || user.role === "admin")) {
    await db.replies.deleteOne({ _id: reply._id });
  }
  refreshAll();
}

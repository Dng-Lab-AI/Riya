"use server";

import { redirect } from "next/navigation";
import { requireUser } from "../auth";
import { FORUM_CATEGORIES } from "../constants";
import { getDb, ObjectId, toObjectId } from "../db";
import { refreshAll, text, type FormState } from "./shared";

export async function sendMessage(recipientId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(`/messages/${recipientId}`);
  const body = text(formData, "body", 4000);
  const to = toObjectId(recipientId);
  if (!body) return { error: "Le message est vide." };
  if (!to || to.equals(user._id)) return { error: "Destinataire invalide." };

  const db = await getDb();
  if (!(await db.users.countDocuments({ _id: to, status: "active" }))) return { error: "Ce membre n'est plus disponible." };
  await db.messages.insertOne({ _id: new ObjectId(), senderId: user._id, recipientId: to, body, readAt: null, createdAt: new Date() });
  refreshAll();
  return { success: "sent" };
}

export async function createTopic(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/forum/nouveau");
  const title = text(formData, "title", 160);
  const body = text(formData, "body", 8000);
  const category = text(formData, "category", 40);
  const languageSlug = text(formData, "language", 40);

  if (title.length < 8) return { error: "Le titre doit faire au moins 8 caractères." };
  if (body.length < 20) return { error: "Détaillez votre question en au moins 20 caractères." };
  if (!FORUM_CATEGORIES.some((c) => c.value === category)) return { error: "Choisissez une catégorie." };

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
  if (body.length < 2) return { error: "Votre réponse est vide." };

  const _id = toObjectId(topicId);
  const db = await getDb();
  if (!_id || !(await db.topics.countDocuments({ _id }))) return { error: "Ce sujet n'existe plus." };
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

import "server-only";
import { getDb, ObjectId, type Role } from "./db";
import { getConversations, type Conversation } from "./queries";

// The messages inbox (contact list on the left, like a chat app), built on the conversations.

export type InboxItem = Conversation & {
  other_role: Role | "former";
  // The last message of the conversation was sent by the viewer ("Vous : …").
  last_mine: boolean;
  archived: boolean;
};

export type Contact = { id: string; name: string; avatar_url: string; role: Role };

export async function getInbox(userId: ObjectId): Promise<InboxItem[]> {
  const db = await getDb();
  const [conversations, me, lastSent] = await Promise.all([
    getConversations(userId),
    db.users.findOne({ _id: userId }, { projection: { archivedChats: 1 } }),
    // When the viewer last wrote to each contact, to tell whose message is the last one.
    db.messages
      .aggregate<{ _id: ObjectId; at: Date }>([
        { $match: { senderId: userId, kind: { $exists: false } } },
        { $group: { _id: "$recipientId", at: { $max: "$createdAt" } } },
      ])
      .toArray(),
  ]);
  const archived = new Set((me?.archivedChats ?? []).map((id) => id.toHexString()));
  const sentAt = new Map(lastSent.map((r) => [r._id.toHexString(), r.at.toISOString()]));
  const roles = new Map(
    (await db.users.find({ _id: { $in: conversations.map((c) => new ObjectId(c.other_id)) } }, { projection: { role: 1 } }).toArray()).map((u) => [u._id.toHexString(), u.role]),
  );
  return conversations.map((c) => ({
    ...c,
    other_role: roles.get(c.other_id) ?? "former",
    last_mine: sentAt.get(c.other_id) === c.last_at,
    archived: archived.has(c.other_id),
  }));
}

// People the viewer can start a conversation with: their tutors (booked or favourite) and,
// for a tutor, their students. A tutor can be both: they may also take lessons with another tutor.
export async function getMessageContacts(userId: ObjectId, role: Role): Promise<Contact[]> {
  const db = await getDb();
  const [students, booked, me] = await Promise.all([
    role === "tutor" ? db.lessons.distinct("studentId", { tutorId: userId }) : [],
    db.lessons.distinct("tutorId", { studentId: userId }),
    db.users.findOne({ _id: userId }, { projection: { favorites: 1 } }),
  ]);
  const ids = [...(students as ObjectId[]), ...(booked as ObjectId[]), ...(me?.favorites ?? [])];
  const people = await db.users
    .find({ _id: { $in: ids, $ne: userId }, status: "active", role: { $in: ["student", "tutor"] } }, { projection: { name: 1, avatarUrl: 1, role: 1 } })
    .toArray();
  return people.map((u) => ({ id: u._id.toHexString(), name: u.name, avatar_url: u.avatarUrl, role: u.role })).sort((a, b) => a.name.localeCompare(b.name));
}

// What the two members have done together, shown at the top of their conversation.
export async function getPairSummary(userId: ObjectId, otherId: ObjectId): Promise<{ completed: number; next_at: string | null }> {
  const db = await getDb();
  const pair = { $or: [{ studentId: userId, tutorId: otherId }, { studentId: otherId, tutorId: userId }] };
  const [completed, next] = await Promise.all([
    db.lessons.countDocuments({ ...pair, status: "completed" }),
    db.lessons.findOne({ ...pair, status: "confirmed", startsAt: { $gt: new Date() } }, { sort: { startsAt: 1 }, projection: { startsAt: 1 } }),
  ]);
  return { completed, next_at: next?.startsAt.toISOString() ?? null };
}

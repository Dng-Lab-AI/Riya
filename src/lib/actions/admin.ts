"use server";

import { requireRole } from "../auth";
import { getDb, toObjectId } from "../db";
import { emptyTutorProfile } from "../tutor-profile";
import { refreshAll } from "./shared";

export async function setUserStatus(userId: string, status: "active" | "suspended") {
  const admin = await requireRole("admin", "/admin");
  const _id = toObjectId(userId);
  if (!_id || _id.equals(admin._id) || !["active", "suspended"].includes(status)) return;
  const db = await getDb();
  await db.users.updateOne({ _id }, { $set: { status } });
  // Suspending signs the member out everywhere.
  if (status === "suspended") await db.sessions.deleteMany({ userId: _id });
  refreshAll();
}

export async function setUserRole(userId: string, role: "student" | "tutor") {
  const admin = await requireRole("admin", "/admin");
  const _id = toObjectId(userId);
  if (!_id || _id.equals(admin._id) || !["student", "tutor"].includes(role)) return;
  const db = await getDb();
  if (role === "tutor") await db.users.updateOne({ _id, tutor: { $exists: false } }, { $set: { tutor: emptyTutorProfile() } });
  await db.users.updateOne({ _id, role: { $ne: "admin" } }, { $set: { role } });
  refreshAll();
}

export async function setTutorApproval(userId: string, approved: boolean) {
  await requireRole("admin", "/admin");
  const _id = toObjectId(userId);
  if (!_id) return;
  await (await getDb()).users.updateOne({ _id, tutor: { $exists: true } }, { $set: { "tutor.approved": approved } });
  refreshAll();
}

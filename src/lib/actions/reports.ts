"use server";

import { defineMessages } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { getCurrentUser, requireAdmin } from "../auth";
import { getDb, ObjectId, toObjectId, type ReportReason } from "../db";
import { refreshAll, text, type FormState } from "./shared";

const REASONS: ReportReason[] = ["behaviour", "no_show", "spam", "fraud", "content", "other"];

const M = defineMessages({
  en: {
    login: "Log in to report a member.", notFound: "Member not found.", self: "You cannot report yourself.", reason: "Choose a reason.",
    details: "Describe what happened in a few words (at least 10 characters).",
    sent: "Thank you. The Riya team has received your report and will look into it; the member is not told who reported them.",
    already: "You already reported this member: the Riya team has it. Your new details have been added.", resolved: "Report marked as handled.",
  },
  fr: {
    login: "Connectez-vous pour signaler un membre.", notFound: "Membre introuvable.", self: "Vous ne pouvez pas vous signaler vous-même.", reason: "Choisissez un motif.",
    details: "Décrivez ce qui s'est passé en quelques mots (10 caractères minimum).",
    sent: "Merci. L'équipe Riya a reçu votre signalement et va l'examiner ; le membre ne sait pas qui l'a signalé.",
    already: "Vous avez déjà signalé ce membre : l'équipe Riya l'a reçu. Vos nouvelles précisions ont été ajoutées.", resolved: "Signalement marqué comme traité.",
  },
});

// A member reports another member to the Riya team (one open report per pair; new details are added to it).
export async function reportMember(targetId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const t = M[await getLocale()];
  const user = await getCurrentUser();
  if (!user) return { error: t.login };
  const _id = toObjectId(targetId);
  if (!_id) return { error: t.notFound };
  if (_id.equals(user._id)) return { error: t.self };
  const reason = String(formData.get("reason") ?? "") as ReportReason;
  if (!REASONS.includes(reason)) return { error: t.reason };
  const details = text(formData, "details", 2000);
  if (details.length < 10) return { error: t.details };

  const db = await getDb();
  if (!(await db.users.countDocuments({ _id }))) return { error: t.notFound };
  const open = await db.reports.findOne({ reporterId: user._id, targetId: _id, status: "open" });
  if (open) {
    await db.reports.updateOne({ _id: open._id }, { $set: { reason, details: `${open.details}\n\n— ${new Date().toISOString().slice(0, 10)} —\n${details}`.slice(0, 6000) } });
    return { success: t.already };
  }
  await db.reports.insertOne({ _id: new ObjectId(), reporterId: user._id, targetId: _id, reason, details, status: "open", createdAt: new Date() });
  return { success: t.sent };
}

// Admin site: the report has been looked into (with what was done).
export async function resolveReport(reportId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const t = M[await getLocale()];
  const _id = toObjectId(reportId);
  if (!_id) return { error: t.notFound };
  const db = await getDb();
  const resolution = text(formData, "resolution", 1000);
  const report = await db.reports.findOneAndUpdate({ _id, status: "open" }, { $set: { status: "resolved", resolvedAt: new Date(), resolvedBy: admin._id, resolution } });
  if (!report) return { error: t.notFound };
  const target = await db.users.findOne({ _id: report.targetId }, { projection: { name: 1, email: 1 } });
  if (target) {
    await db.adminLogs.insertOne({
      _id: new ObjectId(), adminId: admin._id, userId: target._id, action: "report_resolved", note: [report.reason, resolution].filter(Boolean).join(" · "),
      userName: target.name, userEmail: target.email, at: new Date(),
    });
  }
  refreshAll();
  return { success: t.resolved };
}

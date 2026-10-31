"use server";

import { redirect } from "next/navigation";
import { requireUser } from "../auth";
import { getDb } from "../db";
import { markDemoPaid } from "../payments";
import { activeProvider } from "../payments/provider";
import { refreshAll, text } from "./shared";

// Demo checkout (development without a payment key): the student picks a method and pays or gives up.
export async function demoCheckout(reference: string, formData: FormData) {
  if (activeProvider() !== "demo") return;
  const user = await requireUser("/tableau-de-bord");
  const db = await getDb();
  const lesson = await db.lessons.findOne({ "payment.reference": reference, studentId: user._id });
  if (!lesson) return;

  if (formData.get("outcome") === "pay") {
    await markDemoPaid(reference, text(formData, "method", 40) || "card");
  } else {
    await db.lessons.updateOne({ _id: lesson._id, "payment.reference": reference, "payment.status": "pending" }, { $set: { "payment.status": "failed" } });
  }
  refreshAll();
  redirect(`/paiement/retour?tx_ref=${encodeURIComponent(reference)}`);
}

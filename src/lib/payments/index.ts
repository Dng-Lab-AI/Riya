import "server-only";
import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import type { Filter } from "mongodb";
import { getDb, type LessonDoc, type LessonPayment, type UserDoc } from "../db";
import { quoteFor, type Quote } from "./countries";
import { activeProvider, providers } from "./provider";

// An unpaid booking keeps its slot this long, then the slot is offered again.
export const PAYMENT_HOLD_MINUTES = 30;
// A student who cancels earlier than this before the lesson is refunded.
export const FREE_CANCELLATION_HOURS = 24;

// Extra euro exchange rates for currencies not pegged to the euro, e.g. PAYMENT_FX_RATES={"NGN":1650,"KES":140}.
export function fxRates(): Record<string, number> {
  try {
    const parsed = JSON.parse(process.env.PAYMENT_FX_RATES || "{}") as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, number] => typeof entry[1] === "number" && entry[1] > 0));
  } catch {
    return {};
  }
}

export function quoteLesson(countryName: string, priceEur: number): Quote {
  return quoteFor(countryName, priceEur, fxRates());
}

// Share of each lesson kept by Riya (RIYA_COMMISSION, 0.15 = 15 %).
export function commissionRate() {
  const rate = Number(process.env.RIYA_COMMISSION ?? "0.15");
  return rate >= 0 && rate < 1 ? rate : 0.15;
}

export function isPaymentAvailable() {
  return activeProvider() !== null;
}

// Lessons that block their time slot: settled ones, and unpaid ones still within the hold.
export function holdsSlot(): Filter<LessonDoc> {
  return {
    status: { $in: ["pending", "confirmed"] },
    $or: [
      { payment: { $exists: false } },
      { "payment.status": "paid" },
      { "payment.status": "pending", "payment.createdAt": { $gt: new Date(Date.now() - PAYMENT_HOLD_MINUTES * 60 * 1000) } },
    ],
  };
}

export function isSettled(lesson: Pick<LessonDoc, "payment">) {
  return !lesson.payment || lesson.payment.status === "paid";
}

async function siteOrigin() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

// Opens a new payment attempt for the lesson and returns the checkout page to send the student to.
export async function startCheckout(lesson: LessonDoc, student: Pick<UserDoc, "email" | "name">, quote: Quote, description: string): Promise<string> {
  const provider = activeProvider();
  if (!provider) throw new Error("Aucun moyen de paiement n'est configuré.");

  const reference = `riya-${lesson._id.toHexString()}-${randomBytes(4).toString("hex")}`;
  const payment: LessonPayment = {
    provider, reference, status: "pending", amount: quote.amount, currency: quote.currency, country: quote.country, createdAt: new Date(),
  };
  const db = await getDb();
  await db.lessons.updateOne({ _id: lesson._id }, { $set: { payment } });

  return providers[provider].createCheckout({
    reference,
    amount: quote.amount,
    currency: quote.currency,
    methods: quote.methods,
    customer: { email: student.email, name: student.name },
    description,
    returnUrl: `${await siteOrigin()}/paiement/retour`,
  });
}

// Asks the provider whether the payment went through, and records the result.
// Safe to call several times (return page and webhook both call it).
export async function confirmPayment(reference: string): Promise<LessonDoc | null> {
  const db = await getDb();
  const lesson = await db.lessons.findOne({ "payment.reference": reference });
  const payment = lesson?.payment;
  if (!lesson || !payment || payment.status !== "pending" || payment.provider !== "flutterwave") return lesson;

  // No transaction yet (checkout abandoned) or provider unreachable: the payment stays pending.
  const result = await providers.flutterwave.verify(reference).catch(() => null);
  if (result?.status === "paid") {
    // Never trust a payment that is smaller or in another currency than what we asked for.
    if (result.currency !== payment.currency || result.amount < payment.amount) {
      console.error(`Paiement ${reference} : montant reçu ${result.amount} ${result.currency}, attendu ${payment.amount} ${payment.currency}`);
      return lesson;
    }
    await db.lessons.updateOne(
      { _id: lesson._id, "payment.reference": reference, "payment.status": "pending" },
      { $set: { "payment.status": "paid", "payment.paidAt": new Date(), "payment.providerTxId": result.providerTxId, "payment.method": result.method } },
    );
  } else if (result?.status === "failed") {
    await db.lessons.updateOne({ _id: lesson._id, "payment.reference": reference, "payment.status": "pending" }, { $set: { "payment.status": "failed" } });
  }
  return db.lessons.findOne({ _id: lesson._id });
}

export async function markDemoPaid(reference: string, method: string) {
  const db = await getDb();
  await db.lessons.updateOne(
    { "payment.reference": reference, "payment.provider": "demo", "payment.status": "pending" },
    { $set: { "payment.status": "paid", "payment.paidAt": new Date(), "payment.method": method } },
  );
}

// Gives the student their money back. A failed refund is kept visible for the team to handle by hand.
export async function refundLesson(lesson: LessonDoc) {
  const payment = lesson.payment;
  if (payment?.status !== "paid") return;
  const db = await getDb();
  try {
    if (payment.provider === "flutterwave") await providers.flutterwave.refund(payment.providerTxId ?? "");
    await db.lessons.updateOne({ _id: lesson._id }, { $set: { "payment.status": "refunded", "payment.refundedAt": new Date() } });
  } catch (err) {
    console.error(`Remboursement du cours ${lesson._id.toHexString()}`, err);
    await db.lessons.updateOne({ _id: lesson._id }, { $set: { "payment.status": "refund_failed" } });
  }
}

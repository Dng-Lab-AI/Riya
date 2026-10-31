import { timingSafeEqual } from "node:crypto";
import { confirmPayment } from "@/lib/payments";
import { refreshAll } from "@/lib/actions/shared";

// Flutterwave calls this when a payment changes. The body is only a hint: the
// payment is always re-checked with Flutterwave before the lesson is marked paid.
export async function POST(request: Request) {
  const expected = process.env.FLUTTERWAVE_WEBHOOK_HASH ?? "";
  const received = request.headers.get("verif-hash") ?? "";
  const valid = expected.length > 0 && received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  if (!valid) return new Response("Signature invalide", { status: 401 });

  const event = (await request.json().catch(() => null)) as { data?: { tx_ref?: string } } | null;
  const reference = event?.data?.tx_ref;
  if (reference?.startsWith("riya-")) {
    await confirmPayment(reference);
    refreshAll();
  }
  return Response.json({ received: true });
}

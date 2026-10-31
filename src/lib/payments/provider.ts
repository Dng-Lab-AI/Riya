import "server-only";
import type { MethodId } from "./countries";

// Payment providers. Flutterwave (licensed by the BEAC in Cameroon) covers MTN and
// Orange Money in FCFA, mobile money elsewhere in Africa and cards worldwide.
// Without a key, development uses a built-in demo checkout so the whole flow can be tried.

export type ProviderName = "flutterwave" | "demo";

export type CheckoutInput = {
  reference: string;
  amount: number;
  currency: string;
  methods: MethodId[];
  customer: { email: string; name: string };
  description: string;
  returnUrl: string;
};

export type Verification = { status: "paid" | "failed" | "pending"; amount: number; currency: string; providerTxId?: string; method?: string };

export function activeProvider(): ProviderName | null {
  if (process.env.FLUTTERWAVE_SECRET_KEY) return "flutterwave";
  return process.env.NODE_ENV === "production" ? null : "demo";
}

// ── Flutterwave (API v3) ──────────────────────────────────

const FLW_API = "https://api.flutterwave.com/v3";

// Mobile money options depend on the currency (one Flutterwave channel per market).
const FLW_MOBILE_MONEY: Record<string, string> = {
  XAF: "mobilemoneyfranco", XOF: "mobilemoneyfranco", GHS: "mobilemoneyghana", KES: "mpesa",
  UGX: "mobilemoneyuganda", RWF: "mobilemoneyrwanda", TZS: "mobilemoneytanzania",
};

function flutterwaveOptions(methods: MethodId[], currency: string) {
  const options = new Set<string>();
  for (const method of methods) {
    if (method === "card") options.add("card");
    else if (method === "bank") options.add("banktransfer");
    else if (method === "ussd") options.add("ussd");
    else if (method === "wallet") { options.add("applepay"); options.add("googlepay"); }
    else if (FLW_MOBILE_MONEY[currency]) options.add(FLW_MOBILE_MONEY[currency]);
  }
  return [...options].join(", ");
}

async function flw<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${FLW_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as { status?: string; message?: string; data?: unknown } | null;
  if (!res.ok || body?.status !== "success") throw new Error(`Flutterwave ${path} : ${body?.message ?? res.status}`);
  return body.data as T;
}

const flutterwave = {
  async createCheckout(input: CheckoutInput): Promise<string> {
    const data = await flw<{ link: string }>("/payments", {
      method: "POST",
      body: JSON.stringify({
        tx_ref: input.reference,
        amount: input.amount,
        currency: input.currency,
        redirect_url: input.returnUrl,
        payment_options: flutterwaveOptions(input.methods, input.currency),
        customer: input.customer,
        customizations: { title: "Riya", description: input.description },
      }),
    });
    return data.link;
  },

  async verify(reference: string): Promise<Verification> {
    const data = await flw<{ id: number; status: string; amount: number; currency: string; tx_ref: string; payment_type?: string }>(
      `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
    );
    const status = data.status === "successful" ? "paid" : data.status === "failed" ? "failed" : "pending";
    return { status, amount: data.amount, currency: data.currency, providerTxId: String(data.id), method: data.payment_type };
  },

  async refund(providerTxId: string): Promise<void> {
    await flw(`/transactions/${encodeURIComponent(providerTxId)}/refund`, { method: "POST", body: "{}" });
  },
};

// ── Demo (development only) ───────────────────────────────
// The demo checkout page records the result itself, so there is nothing to verify.

const demo = {
  async createCheckout(input: CheckoutInput): Promise<string> {
    return `/paiement/demo/${encodeURIComponent(input.reference)}`;
  },
  async refund(): Promise<void> {},
};

export const providers = { flutterwave, demo };

import { redirect } from "next/navigation";
import { safeRedirectPath } from "@/lib/actions/shared";
import { createSession } from "@/lib/auth";
import { consumeToken } from "@/lib/auth-tokens";
import { getDb } from "@/lib/db";

// The link from the confirmation e-mail: activates the account and signs the user in.
export async function GET(request: Request) {
  const doc = await consumeToken(new URL(request.url).searchParams.get("token") ?? "", "verify-email");
  if (!doc) redirect("/verifier-email?expire=1");

  const db = await getDb();
  await db.users.updateOne({ _id: doc.userId }, { $set: { emailVerified: true } });
  await createSession(doc.userId);
  const next = safeRedirectPath(doc.next ?? null, "/tableau-de-bord");
  redirect(`${next}${next.includes("?") ? "&" : "?"}verifie=1`);
}

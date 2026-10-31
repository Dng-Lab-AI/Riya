import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { toObjectId } from "@/lib/db";
import { getThread, getUnreadCount, markThreadRead } from "@/lib/queries";

// Polled by the live message badge (every few seconds, anywhere on the site) and by an
// open conversation. Without "avec" it only returns the unread count; with "avec" it also
// returns the messages received after "apres", and marks that conversation read when "lu=1".
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Non connecté" }, { status: 401 });

  const other = toObjectId(request.nextUrl.searchParams.get("avec"));
  let messages;
  if (other && !other.equals(user._id)) {
    const after = toObjectId(request.nextUrl.searchParams.get("apres"));
    messages = await getThread(user._id, other, after);
    // Only mark read while the tab is actually open on the conversation.
    if (request.nextUrl.searchParams.get("lu") === "1") await markThreadRead(user._id, other);
  }

  const unread = await getUnreadCount(user._id);
  return Response.json({ unread, ...(messages ? { messages } : {}) }, { headers: { "Cache-Control": "no-store" } });
}

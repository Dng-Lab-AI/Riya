import { ConversationList } from "@/components/messages/ConversationList";
import { MessagesShell } from "@/components/messages/MessagesShell";
import { getCurrentUser } from "@/lib/auth";
import { getInbox } from "@/lib/inbox";

// The administrator's conversations with members (started from a member's page; members reply from their own messages).
export default async function AdminMessagesLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return children;
  const inbox = await getInbox(user._id);
  return <MessagesShell list={<ConversationList initial={inbox} contacts={[]} />}>{children}</MessagesShell>;
}

import { ConversationList } from "@/components/messages/ConversationList";
import { MessagesShell } from "@/components/messages/MessagesShell";
import { getCurrentUser } from "@/lib/auth";
import { getInbox, getMessageContacts } from "@/lib/inbox";

// The contact list stays on screen while moving from one conversation to another.
export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  // Each page sends signed-out visitors to the login page with the right return path.
  if (!user) return children;
  const [inbox, contacts] = await Promise.all([getInbox(user._id), getMessageContacts(user._id, user.role)]);
  return <MessagesShell list={<ConversationList initial={inbox} contacts={contacts} />}>{children}</MessagesShell>;
}

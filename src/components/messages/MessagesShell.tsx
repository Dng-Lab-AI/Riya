"use client";

import { usePathname } from "next/navigation";

// Two columns like a chat app: contacts on the left, the open conversation on the right.
// On a phone, one at a time: the list, or the conversation (with a back button).
export function MessagesShell({ list, children }: { list: React.ReactNode; children: React.ReactNode }) {
  const inThread = usePathname() !== "/messages";
  return (
    <div className="flex h-[calc(100dvh-8.5rem)] min-h-[32rem] overflow-hidden rounded-[1.75rem] border border-sand-200 bg-white">
      <aside className={`${inThread ? "hidden lg:flex" : "flex"} w-full min-w-0 flex-col lg:w-[21rem] lg:shrink-0 lg:border-r lg:border-sand-200`}>{list}</aside>
      <section className={`${inThread ? "flex" : "hidden lg:flex"} min-w-0 flex-1 flex-col`}>{children}</section>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Send } from "lucide-react";
import { sendMessage } from "@/lib/actions/community";
import type { Message } from "@/lib/queries";
import { LocalDateTime } from "./client";

const POLL_MS = 3000;

// A conversation that updates on its own: it polls for new messages and marks them read,
// so neither side has to reload. Sending pushes a poll right away, so it feels instant.
export function LiveThread({ otherId, otherFirstName, me, initial }: { otherId: string; otherFirstName: string; me: string; initial: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initial);
  const [error, setError] = useState<string>();
  const [pending, startSending] = useTransition();
  const lastId = useRef(initial.at(-1)?.id ?? "");
  const bottom = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  // Merge in anything the poll (or our own send) brings back, ignoring ids we already show.
  const absorb = (incoming: Message[]) => {
    if (!incoming.length) return;
    setMessages((current) => {
      const known = new Set(current.map((m) => m.id));
      const fresh = incoming.filter((m) => !known.has(m.id));
      if (!fresh.length) return current;
      lastId.current = fresh.at(-1)!.id;
      return [...current, ...fresh];
    });
  };

  const poll = async () => {
    const visible = document.visibilityState === "visible";
    try {
      const res = await fetch(`/api/messages?avec=${otherId}&apres=${lastId.current}${visible ? "&lu=1" : ""}`, { cache: "no-store" });
      if (res.ok) absorb(((await res.json()).messages ?? []) as Message[]);
    } catch {
      // A missed poll is harmless; the next one catches up.
    }
  };

  useEffect(() => {
    const timer = setInterval(poll, POLL_MS);
    const onFocus = () => poll();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
    // otherId is fixed for the page; poll reads the latest id from the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const send = (form: HTMLFormElement) => {
    const data = new FormData(form);
    if (!String(data.get("body") ?? "").trim()) return;
    setError(undefined);
    startSending(async () => {
      const state = await sendMessage(otherId, undefined, data);
      if (state?.error) return setError(state.error);
      form.reset();
      textarea.current?.focus();
      await poll(); // pull our own message straight into the list
    });
  };

  return (
    <>
      <div className="pattern-bogolan my-4 flex min-h-[40vh] flex-col gap-3 overflow-y-auto rounded-2xl border border-sand-200 p-4" style={{ maxHeight: "60vh" }}>
        {messages.length === 0 && <p className="m-auto text-sm text-earth-500">Envoyez votre premier message à {otherFirstName}.</p>}
        {messages.map((m) => {
          const mine = m.sender_id === me;
          return (
            <div key={m.id} className={`max-w-[80%] ${mine ? "self-end" : "self-start"}`}>
              <div className={`whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm ${mine ? "rounded-br-sm bg-clay-600 text-white" : "rounded-bl-sm bg-white text-earth-900 shadow-sm"}`}>
                {m.body}
              </div>
              <p className={`mt-1 text-[11px] text-earth-500 ${mine ? "text-right" : ""}`}>
                <LocalDateTime iso={m.created_at} />
              </p>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(e.currentTarget);
        }}
        className="flex items-end gap-2"
      >
        <div className="flex-1">
          <label htmlFor="body" className="sr-only">Votre message</label>
          <textarea
            ref={textarea}
            id="body"
            name="body"
            rows={2}
            required
            placeholder="Écrivez votre message…"
            className="input resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          {error && <p role="alert" className="mt-1 text-sm text-clay-700">{error}</p>}
        </div>
        <button type="submit" disabled={pending} className="btn-primary h-11" aria-label="Envoyer">
          <Send size={18} />
        </button>
      </form>
    </>
  );
}

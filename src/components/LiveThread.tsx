"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { BellRing, MessageCircleReply, Send } from "lucide-react";
import { defineMessages } from "@/i18n";
import { useLocale } from "@/i18n/client";
import { sendMessage } from "@/lib/actions/community";
import type { Message } from "@/lib/queries";
import { LocalDateTime } from "./client";

const POLL_MS = 3000;

const M = defineMessages({
  en: {
    interestReply: (name: string) => `Hello ${name}, thank you for your interest in my profile! What are your goals? I'd be glad to welcome you for a first lesson.`,
    bookingReply: (name: string) => `Hello ${name}, I saw you wanted to book a lesson with me. Do you have any questions? If the time doesn't suit you, tell me when you're available.`,
    first: (name: string) => `Send your first message to ${name}.`, interested: "Student interested in your profile", unfinished: "Unfinished booking",
    writeTo: (name: string) => `Write to ${name}`, yourMessage: "Your message", placeholder: "Write your message…", send: "Send",
  },
  fr: {
    interestReply: (name: string) => `Bonjour ${name}, merci pour l'intérêt que vous portez à mon profil ! Quels sont vos objectifs ? Je serais ravi·e de vous accueillir pour un premier cours.`,
    bookingReply: (name: string) => `Bonjour ${name}, j'ai vu que vous vouliez réserver un cours avec moi. Avez-vous une question ? Si l'horaire ne vous convient pas, dites-moi quand vous êtes disponible.`,
    first: (name: string) => `Envoyez votre premier message à ${name}.`, interested: "Élève intéressé·e par votre profil", unfinished: "Réservation non terminée",
    writeTo: (name: string) => `Écrire à ${name}`, yourMessage: "Votre message", placeholder: "Écrivez votre message…", send: "Envoyer",
  },
});

// A conversation that updates on its own: it polls for new messages and marks them read,
// so neither side has to reload. Sending pushes a poll right away, so it feels instant.
export function LiveThread({ otherId, otherFirstName, me, initial }: { otherId: string; otherFirstName: string; me: string; initial: Message[] }) {
  const t = M[useLocale()];
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

  // Keep the latest message in view, scrolling only the conversation (not the whole page).
  useEffect(() => {
    const box = bottom.current?.parentElement;
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // A ready-to-edit first message after a notification, so the tutor reaches out in one click.
  const suggestReply = (kind: NonNullable<Message["kind"]>) => {
    const field = textarea.current;
    if (!field) return;
    if (!field.value.trim()) {
      field.value = kind === "interest" ? t.interestReply(otherFirstName) : t.bookingReply(otherFirstName);
    }
    field.focus();
  };

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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="pattern-bogolan flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-sand-50 p-4">
        {messages.length === 0 && <p className="m-auto text-sm text-earth-500">{t.first(otherFirstName)}</p>}
        {messages.map((m) => {
          const mine = m.sender_id === me;
          if (m.kind) {
            return (
              <div key={m.id} className="mx-auto w-full max-w-md rounded-2xl border border-ochre-300 bg-ochre-100 p-4 text-sm text-ochre-800 shadow-sm">
                <p className="flex items-center gap-2 font-semibold">
                  <BellRing size={16} /> {m.kind === "interest" ? t.interested : t.unfinished}
                </p>
                <p className="mt-1 text-earth-800">{m.body}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-earth-500"><LocalDateTime iso={m.created_at} /></span>
                  <button type="button" onClick={() => suggestReply(m.kind!)} className="btn-dark px-3.5 py-1.5 text-xs">
                    <MessageCircleReply size={14} /> {t.writeTo(otherFirstName)}
                  </button>
                </div>
              </div>
            );
          }
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
        className="flex items-end gap-2 border-t border-sand-200 bg-white p-3"
      >
        <div className="flex-1">
          <label htmlFor="body" className="sr-only">{t.yourMessage}</label>
          <textarea
            ref={textarea}
            id="body"
            name="body"
            rows={2}
            required
            placeholder={t.placeholder}
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
        <button type="submit" disabled={pending} className="btn-primary h-11" aria-label={t.send}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

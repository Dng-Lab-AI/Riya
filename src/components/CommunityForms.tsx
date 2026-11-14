"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { defineMessages } from "@/i18n";
import { useLocale } from "@/i18n/client";
import { createTopic, replyToTopic, sendMessage } from "@/lib/actions/community";
import { FORUM_CATEGORIES, choicesFor } from "@/lib/constants";
import { SubmitButton, useKeepValuesForm } from "./client";
import { FormAlert } from "./ui";

const M = defineMessages({
  en: {
    yourMessage: "Your message", writeMessage: "Write your message…", send: "Send",
    yourReply: "Your reply", replyPlaceholder: "Share your experience, a tip, a resource…", publishing: "Publishing…", reply: "Reply",
    title: "Title", titlePlaceholder: "E.g. How do you pronounce the tones in Yoruba?", category: "Category",
    language: "Language", noLanguage: "None in particular", message: "Message", publish: "Publish the discussion",
  },
  fr: {
    yourMessage: "Votre message", writeMessage: "Écrivez votre message…", send: "Envoyer",
    yourReply: "Votre réponse", replyPlaceholder: "Partagez votre expérience, une astuce, une ressource…", publishing: "Publication…", reply: "Répondre",
    title: "Titre", titlePlaceholder: "Ex. : Comment prononcer les tons en yoruba ?", category: "Catégorie",
    language: "Langue concernée", noLanguage: "Aucune en particulier", message: "Message", publish: "Publier la discussion",
  },
});

// Message and reply boxes use a plain form action: React clears them once sent.

export function MessageForm({ recipientId }: { recipientId: string }) {
  const t = M[useLocale()];
  const [state, action] = useActionState(sendMessage.bind(null, recipientId), undefined);
  return (
    <form action={action} className="flex items-end gap-2">
      <div className="flex-1">
        <label htmlFor="body" className="sr-only">{t.yourMessage}</label>
        <textarea id="body" name="body" rows={2} required placeholder={t.writeMessage} className="input resize-none" />
        <FormAlert state={state} />
      </div>
      <SubmitButton className="btn-primary h-11" pendingText="…" aria-label={t.send}><Send size={18} /></SubmitButton>
    </form>
  );
}

export function ReplyForm({ topicId }: { topicId: string }) {
  const t = M[useLocale()];
  const [state, action] = useActionState(replyToTopic.bind(null, topicId), undefined);
  return (
    <form action={action} className="space-y-3">
      <label htmlFor="reply" className="label">{t.yourReply}</label>
      <textarea id="reply" name="body" rows={4} required className="input" placeholder={t.replyPlaceholder} />
      <FormAlert state={state} />
      <SubmitButton pendingText={t.publishing}>{t.reply}</SubmitButton>
    </form>
  );
}

export function TopicForm({ languages, defaultLanguage }: { languages: { slug: string; name: string }[]; defaultLanguage: string }) {
  const locale = useLocale();
  const t = M[locale];
  const { state, pending, onSubmit } = useKeepValuesForm(createTopic);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="title">{t.title}</label>
        <input id="title" name="title" required maxLength={160} className="input" placeholder={t.titlePlaceholder} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="category">{t.category}</label>
          <select id="category" name="category" className="input" defaultValue="general">
            {choicesFor(FORUM_CATEGORIES, locale).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="language">{t.language}</label>
          <select id="language" name="language" className="input" defaultValue={defaultLanguage}>
            <option value="">{t.noLanguage}</option>
            {languages.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="body">{t.message}</label>
        <textarea id="body" name="body" rows={8} required className="input" />
      </div>
      <FormAlert state={state} />
      <SubmitButton pending={pending} pendingText={t.publishing}>{t.publish}</SubmitButton>
    </form>
  );
}

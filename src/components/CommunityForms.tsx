"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { createTopic, replyToTopic, sendMessage } from "@/lib/actions/community";
import { FORUM_CATEGORIES } from "@/lib/constants";
import { SubmitButton, useKeepValuesForm } from "./client";
import { FormAlert } from "./ui";

// Message and reply boxes use a plain form action: React clears them once sent.

export function MessageForm({ recipientId }: { recipientId: string }) {
  const [state, action] = useActionState(sendMessage.bind(null, recipientId), undefined);
  return (
    <form action={action} className="flex items-end gap-2">
      <div className="flex-1">
        <label htmlFor="body" className="sr-only">Votre message</label>
        <textarea id="body" name="body" rows={2} required placeholder="Écrivez votre message…" className="input resize-none" />
        <FormAlert state={state} />
      </div>
      <SubmitButton className="btn-primary h-11" pendingText="…" aria-label="Envoyer"><Send size={18} /></SubmitButton>
    </form>
  );
}

export function ReplyForm({ topicId }: { topicId: string }) {
  const [state, action] = useActionState(replyToTopic.bind(null, topicId), undefined);
  return (
    <form action={action} className="space-y-3">
      <label htmlFor="reply" className="label">Votre réponse</label>
      <textarea id="reply" name="body" rows={4} required className="input" placeholder="Partagez votre expérience, une astuce, une ressource…" />
      <FormAlert state={state} />
      <SubmitButton pendingText="Publication…">Répondre</SubmitButton>
    </form>
  );
}

export function TopicForm({ languages, defaultLanguage }: { languages: { slug: string; name: string }[]; defaultLanguage: string }) {
  const { state, pending, onSubmit } = useKeepValuesForm(createTopic);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="title">Titre</label>
        <input id="title" name="title" required maxLength={160} className="input" placeholder="Ex. : Comment prononcer les tons en yoruba ?" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="category">Catégorie</label>
          <select id="category" name="category" className="input" defaultValue="general">
            {FORUM_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="language">Langue concernée</label>
          <select id="language" name="language" className="input" defaultValue={defaultLanguage}>
            <option value="">Aucune en particulier</option>
            {languages.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="body">Message</label>
        <textarea id="body" name="body" rows={8} required className="input" />
      </div>
      <FormAlert state={state} />
      <SubmitButton pending={pending} pendingText="Publication…">Publier la discussion</SubmitButton>
    </form>
  );
}

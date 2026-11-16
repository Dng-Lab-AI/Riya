"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { defineMessages } from "@/i18n";
import { useLocale } from "@/i18n/client";
import { leaveReview } from "@/lib/actions/lessons";
import { SubmitButton } from "./client";
import { FormAlert } from "./ui";

const M = defineMessages({
  en: {
    open: "Leave a review", rating: "Rating", star: (i: number) => `${i} star${i > 1 ? "s" : ""}`,
    placeholder: "What did you think of this lesson?", sending: "Sending…", publish: "Publish my review",
  },
  fr: {
    open: "Laisser un avis", rating: "Note", star: (i: number) => `${i} étoile${i > 1 ? "s" : ""}`,
    placeholder: "Qu'avez-vous pensé de ce cours ?", sending: "Envoi…", publish: "Publier mon avis",
  },
});

export function ReviewForm({ lessonId }: { lessonId: string }) {
  const t = M[useLocale()];
  const [state, action] = useActionState(leaveReview.bind(null, lessonId), undefined);
  const [rating, setRating] = useState(0);
  const [open, setOpen] = useState(false);

  if (!open) {
    return <button onClick={() => setOpen(true)} className="btn-outline">{t.open}</button>;
  }

  return (
    <form action={action} className="mt-3 w-full space-y-3 rounded-xl bg-sand-50 p-4">
      <input type="hidden" name="rating" value={rating} />
      <div className="flex gap-1" role="radiogroup" aria-label={t.rating}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" onClick={() => setRating(i)} aria-label={t.star(i)} aria-pressed={rating === i}>
            <Star size={26} className={i <= rating ? "fill-ochre-400 text-ochre-400" : "text-sand-300"} />
          </button>
        ))}
      </div>
      <textarea name="comment" rows={3} className="input" placeholder={t.placeholder} />
      <FormAlert state={state} />
      <SubmitButton disabled={!rating} pendingText={t.sending}>{t.publish}</SubmitButton>
    </form>
  );
}

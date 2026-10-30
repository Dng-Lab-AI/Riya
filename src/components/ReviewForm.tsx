"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { leaveReview } from "@/lib/actions/lessons";
import { SubmitButton } from "./client";
import { FormAlert } from "./ui";

export function ReviewForm({ lessonId }: { lessonId: string }) {
  const [state, action] = useActionState(leaveReview.bind(null, lessonId), undefined);
  const [rating, setRating] = useState(0);
  const [open, setOpen] = useState(false);

  if (!open) {
    return <button onClick={() => setOpen(true)} className="btn-outline">Laisser un avis</button>;
  }

  return (
    <form action={action} className="mt-3 w-full space-y-3 rounded-xl bg-sand-50 p-4">
      <input type="hidden" name="rating" value={rating} />
      <div className="flex gap-1" role="radiogroup" aria-label="Note">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" onClick={() => setRating(i)} aria-label={`${i} étoile${i > 1 ? "s" : ""}`} aria-pressed={rating === i}>
            <Star size={26} className={i <= rating ? "fill-ochre-400 text-ochre-400" : "text-sand-300"} />
          </button>
        ))}
      </div>
      <textarea name="comment" rows={3} className="input" placeholder="Qu'avez-vous pensé de ce cours ?" />
      <FormAlert state={state} />
      <SubmitButton disabled={!rating} pendingText="Envoi…">Publier mon avis</SubmitButton>
    </form>
  );
}

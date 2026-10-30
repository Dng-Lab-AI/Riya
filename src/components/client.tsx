"use client";

import { startTransition, useActionState } from "react";
import { useFormStatus } from "react-dom";

// Client-side helpers that need the browser (pending state, local time zone).

type FormState = { error?: string; success?: string } | undefined;

// React resets a <form action> after every submission, wiping the user's input
// even when the server returns a validation error. Submitting through onSubmit
// keeps what was typed.
export function useKeepValuesForm(action: (state: FormState, formData: FormData) => Promise<FormState>) {
  const [state, dispatch, pending] = useActionState(action, undefined);
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };
  return { state, pending, onSubmit };
}

export function SubmitButton({
  children,
  pendingText,
  className = "btn-primary",
  disabled,
  pending: pendingProp,
  ...props
}: React.ComponentProps<"button"> & { pendingText?: string; pending?: boolean }) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <button type="submit" disabled={pending || disabled} className={className} {...props}>
      {pending ? (pendingText ?? "Patientez…") : children}
    </button>
  );
}

// Dates are stored in UTC and shown in the visitor's own time zone.
export function LocalDateTime({ iso, mode = "datetime" }: { iso: string; mode?: "datetime" | "date" | "time" }) {
  const date = new Date(iso);
  const options: Intl.DateTimeFormatOptions =
    mode === "date" ? { weekday: "long", day: "numeric", month: "long" }
    : mode === "time" ? { hour: "2-digit", minute: "2-digit" }
    : { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" };
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {date.toLocaleString("fr-FR", options)}
    </time>
  );
}

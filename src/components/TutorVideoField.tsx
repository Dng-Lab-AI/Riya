"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2, Trash2, Upload } from "lucide-react";
import { defineMessages } from "@/i18n";
import { useLocale } from "@/i18n/client";
import { setVideoLink } from "@/lib/actions/video";
import { TUTOR_VIDEO_MAX_BYTES, TUTOR_VIDEO_MAX_SECONDS, TUTOR_VIDEO_TYPES } from "@/lib/constants";
import type { VideoView } from "@/lib/tutor-video";
import { TutorVideoPlayer } from "./TutorVideoPlayer";
import { FormAlert } from "./ui";

const MAX_MB = Math.round(TUTOR_VIDEO_MAX_BYTES / 1024 / 1024);
const MAX_MIN = TUTOR_VIDEO_MAX_SECONDS / 60;

const M = defineMessages({
  en: {
    format: "Format not accepted: choose an MP4, WebM or MOV video.", heavy: `Video too large (${MAX_MB} MB maximum). Film in 720p or shorten it.`,
    long: (s: number) => `Video too long (${s} s): ${MAX_MIN} minutes maximum.`, failed: "The upload failed. Please try again.",
    lost: "Connection lost during the upload. Please try again.", confirm: "Delete your presentation video?", deleteFailed: "Deleting failed.",
    yours: "Your presentation video", delete: "Delete the video",
    intro: "Students are more likely to choose a tutor they've seen and heard. Introduce yourself in 1 to 2 minutes: who you are, what a lesson with you is like, and say a few words in the language you teach.",
    kind: "Video type", upload: "Upload a file", link: "YouTube link", sending: "Uploading…", replace: "Replace the video", choose: "Choose a video",
    limits: `MP4, WebM or MOV · ${MAX_MIN} minutes and ${MAX_MB} MB maximum · landscape recommended.`, saving: "Saving…", use: "Use this video",
  },
  fr: {
    format: "Format non accepté : choisissez une vidéo MP4, WebM ou MOV.", heavy: `Vidéo trop lourde (${MAX_MB} Mo maximum). Filmez en 720p ou raccourcissez-la.`,
    long: (s: number) => `Vidéo trop longue (${s} s) : ${MAX_MIN} minutes maximum.`, failed: "L'envoi a échoué. Réessayez.",
    lost: "Connexion perdue pendant l'envoi. Réessayez.", confirm: "Supprimer votre vidéo de présentation ?", deleteFailed: "La suppression a échoué.",
    yours: "Votre vidéo de présentation", delete: "Supprimer la vidéo",
    intro: "Les élèves choisissent plus volontiers un tuteur qu'ils ont vu et entendu. Présentez-vous en 1 à 2 minutes : qui vous êtes, comment se passe un cours avec vous, et dites quelques mots dans la langue que vous enseignez.",
    kind: "Type de vidéo", upload: "Envoyer un fichier", link: "Lien YouTube", sending: "Envoi…", replace: "Remplacer la vidéo", choose: "Choisir une vidéo",
    limits: `MP4, WebM ou MOV · ${MAX_MIN} minutes et ${MAX_MB} Mo maximum · format paysage conseillé.`, saving: "Enregistrement…", use: "Utiliser cette vidéo",
  },
});

// Length of a video file, read by the browser before sending it.
function durationOf(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(NaN);
    };
    video.src = url;
  });
}

// "Presentation video" on the tutor's profile page: upload a short clip, or paste a YouTube link.
export function TutorVideoField({ video }: { video: VideoView }) {
  const t = M[useLocale()];
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"upload" | "link">(video?.kind === "youtube" ? "link" : "upload");
  const [linkState, linkAction, linking] = useActionState(setVideoLink, undefined);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!TUTOR_VIDEO_TYPES.includes(file.type)) return setError(t.format);
    if (file.size > TUTOR_VIDEO_MAX_BYTES) return setError(t.heavy);
    const seconds = await durationOf(file);
    if (seconds > TUTOR_VIDEO_MAX_SECONDS + 1) return setError(t.long(Math.round(seconds)));

    const form = new FormData();
    form.append("file", file);
    form.append("duration", String(seconds));
    // XMLHttpRequest rather than fetch, to show the upload progress.
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/profil/video");
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      if (xhr.status >= 200 && xhr.status < 300) router.refresh();
      else setError((() => { try { return JSON.parse(xhr.responseText).error; } catch { return t.failed; } })());
    };
    xhr.onerror = () => {
      setProgress(null);
      setError(t.lost);
    };
    setProgress(0);
    xhr.send(form);
  };

  const remove = async () => {
    if (!window.confirm(t.confirm)) return;
    const res = await fetch("/api/profil/video", { method: "DELETE" });
    if (res.ok) router.refresh();
    else setError(t.deleteFailed);
  };

  return (
    <div className="space-y-4">
      {video ? (
        <div className="space-y-2">
          <TutorVideoPlayer video={video} title={t.yours} className="max-w-xl" />
          <button type="button" onClick={remove} className="btn-ghost px-2 text-sm text-clay-700"><Trash2 size={15} /> {t.delete}</button>
        </div>
      ) : (
        <p className="rounded-2xl bg-sand-50 p-4 text-sm text-earth-600">
          {t.intro}
        </p>
      )}

      <div className="flex gap-1 rounded-full bg-sand-100 p-1 text-sm font-medium sm:w-fit" role="tablist" aria-label={t.kind}>
        {([["upload", t.upload], ["link", t.link]] as const).map(([value, label]) => (
          <button key={value} type="button" role="tab" aria-selected={mode === value} onClick={() => setMode(value)} className={`flex-1 rounded-full px-4 py-1.5 transition sm:flex-none ${mode === value ? "bg-white shadow-sm" : "text-earth-600"}`}>
            {label}
          </button>
        ))}
      </div>

      {mode === "upload" ? (
        <div>
          <input ref={input} type="file" accept={TUTOR_VIDEO_TYPES.join(",")} className="sr-only" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
          <button type="button" disabled={progress !== null} onClick={() => input.current?.click()} className="btn-outline">
            {progress !== null ? <><Loader2 size={16} className="animate-spin" /> {t.sending} {progress}%</> : <><Upload size={16} /> {video ? t.replace : t.choose}</>}
          </button>
          {progress !== null && (
            <div className="mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-sand-200"><div className="h-full rounded-full bg-forest-600 transition-all" style={{ width: `${progress}%` }} /></div>
          )}
          <p className="mt-2 text-xs text-earth-500">{t.limits}</p>
        </div>
      ) : (
        <form action={linkAction} className="flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">{t.link}</span>
            <Link2 size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-earth-400" />
            <input name="url" required placeholder="https://www.youtube.com/watch?v=…" className="input pl-10" />
          </label>
          <button disabled={linking} className="btn-outline shrink-0">{linking ? t.saving : t.use}</button>
        </form>
      )}
      <FormAlert state={linkState} />
      {error && <p role="alert" className="rounded-xl bg-clay-50 px-4 py-3 text-sm font-medium text-clay-800">{error}</p>}
    </div>
  );
}

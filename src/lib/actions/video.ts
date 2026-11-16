"use server";

import { defineMessages } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { requireUser } from "../auth";
import { youtubeIdFrom } from "../constants";
import { setTutorYoutubeVideo } from "../tutor-video";
import { refreshAll, text, type FormState } from "./shared";

const M = defineMessages({
  en: { tutorsOnly: "Only tutors have a presentation video.", link: "Paste the link of a YouTube video (youtube.com/watch?v=… or youtu.be/…).", saved: "YouTube video saved." },
  fr: { tutorsOnly: "Seuls les tuteurs ont une vidéo de présentation.", link: "Collez le lien d'une vidéo YouTube (youtube.com/watch?v=… ou youtu.be/…).", saved: "Vidéo YouTube enregistrée." },
});

// A tutor uses a YouTube video as their presentation video (instead of uploading a file).
export async function setVideoLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/profil/tuteur");
  const t = M[await getLocale()];
  if (user.role !== "tutor") return { error: t.tutorsOnly };
  const youtubeId = youtubeIdFrom(text(formData, "url", 300));
  if (!youtubeId) return { error: t.link };
  await setTutorYoutubeVideo(user._id, youtubeId);
  refreshAll();
  return { success: t.saved };
}

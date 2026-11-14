"use server";

import { requireUser } from "../auth";
import { youtubeIdFrom } from "../constants";
import { setTutorYoutubeVideo } from "../tutor-video";
import { refreshAll, text, type FormState } from "./shared";

// A tutor uses a YouTube video as their presentation video (instead of uploading a file).
export async function setVideoLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/profil/tuteur");
  if (user.role !== "tutor") return { error: "Seuls les tuteurs ont une vidéo de présentation." };
  const youtubeId = youtubeIdFrom(text(formData, "url", 300));
  if (!youtubeId) return { error: "Collez le lien d'une vidéo YouTube (youtube.com/watch?v=… ou youtu.be/…)." };
  await setTutorYoutubeVideo(user._id, youtubeId);
  refreshAll();
  return { success: "Vidéo YouTube enregistrée." };
}

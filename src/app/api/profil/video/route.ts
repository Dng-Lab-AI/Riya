import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { defineMessages } from "@/i18n";
import { getLocale } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";

const M = defineMessages({
  en: { signedOut: "Not logged in", tutorsOnly: "Only tutors have a presentation video.", none: "No video received." },
  fr: { signedOut: "Non connecté", tutorsOnly: "Seuls les tuteurs ont une vidéo de présentation.", none: "Aucune vidéo reçue." },
});
import { removeTutorVideo, saveTutorVideo, validateTutorVideo } from "@/lib/tutor-video";

// The signed-in tutor uploads (POST) or removes (DELETE) their presentation video.

async function tutor() {
  const locale = await getLocale();
  const t = M[locale];
  const user = await getCurrentUser();
  if (!user) return { error: Response.json({ error: t.signedOut }, { status: 401 }) };
  if (user.role !== "tutor") return { error: Response.json({ error: t.tutorsOnly }, { status: 403 }) };
  return { user, locale, t };
}

export async function POST(request: NextRequest) {
  const access = await tutor();
  if (access.error) return access.error;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: access.t.none }, { status: 400 });
  const invalid = validateTutorVideo(file, Number(form?.get("duration") ?? NaN), access.locale);
  if (invalid) return Response.json({ error: invalid }, { status: 400 });

  await saveTutorVideo(access.user._id, file);
  revalidatePath("/", "layout");
  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE() {
  const access = await tutor();
  if (access.error) return access.error;
  await removeTutorVideo(access.user._id);
  revalidatePath("/", "layout");
  return Response.json({ ok: true });
}

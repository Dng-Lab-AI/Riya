import { getDb, toObjectId } from "@/lib/db";

// A member's uploaded profile photo. Public, like the photo on a tutor's profile page.
// Its address carries a version (?v=…) that changes with each upload, so it can be cached for good.
export async function GET(_request: Request, ctx: RouteContext<"/api/avatars/[id]">) {
  const id = toObjectId((await ctx.params).id);
  const avatar = id && (await (await getDb()).avatars.findOne({ _id: id }));
  if (!avatar) return new Response("Photo introuvable", { status: 404 });

  return new Response(new Uint8Array(avatar.data.buffer), {
    headers: {
      "Content-Type": avatar.contentType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

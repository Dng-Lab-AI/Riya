import { Readable } from "node:stream";
import type { NextRequest } from "next/server";
import { getDb, toObjectId } from "@/lib/db";

// Plays a tutor's presentation video (public, like the profile it belongs to).
// Supports byte ranges, which browsers need to seek and which Safari needs to play at all.
export async function GET(request: NextRequest, ctx: RouteContext<"/api/videos/[id]">) {
  const fileId = toObjectId((await ctx.params).id);
  if (!fileId) return new Response("Video not found", { status: 404 });
  const db = await getDb();
  const file = await db.videos.find({ _id: fileId }).next();
  if (!file) return new Response("Video not found", { status: 404 });

  const size = file.length;
  const contentType = (file.metadata as { contentType?: string } | undefined)?.contentType ?? "video/mp4";
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=86400",
    "X-Content-Type-Options": "nosniff",
  };

  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    // "bytes=100-" (from 100), "bytes=100-199", or "bytes=-500" (the last 500 bytes).
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    const stream = Readable.toWeb(db.videos.openDownloadStream(fileId, { start, end: end + 1 })) as ReadableStream;
    return new Response(stream, { status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) } });
  }

  const stream = Readable.toWeb(db.videos.openDownloadStream(fileId)) as ReadableStream;
  return new Response(stream, { headers: { ...headers, "Content-Length": String(size) } });
}

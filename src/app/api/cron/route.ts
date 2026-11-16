import { runScheduledJobs } from "@/lib/jobs";

// For a scheduler (Vercel Cron, an uptime monitor…): GET /api/cron with "Authorization: Bearer <CRON_SECRET>".
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Forbidden", { status: 403 });
  await runScheduledJobs(true);
  return Response.json({ ok: true });
}

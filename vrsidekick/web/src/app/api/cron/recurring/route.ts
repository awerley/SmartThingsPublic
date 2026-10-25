import { json, route, unauthorized } from "@/lib/http";
import { extendAllSeries } from "@/lib/services/jobs";

/**
 * Daily job (e.g. Vercel Cron or any scheduler): schedules upcoming occurrences
 * of every active recurring series. Authenticate with `Authorization: Bearer $CRON_SECRET`.
 */
async function run(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) throw unauthorized();
  return json(await extendAllSeries());
}

export const GET = route(run);
export const POST = route(run);

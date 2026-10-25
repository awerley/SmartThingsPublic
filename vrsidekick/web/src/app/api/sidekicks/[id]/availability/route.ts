import { json, route, searchParams } from "@/lib/http";
import { openWindowsFor } from "@/lib/services/sidekicks";

/** Open windows (standard schedule ± exceptions − booked jobs) for booking. */
export const GET = route(async (req, ctx) => {
  const { id } = await ctx.params;
  const sp = searchParams(req);
  const from = sp.get("from") ? new Date(sp.get("from")!) : new Date();
  const to = sp.get("to") ? new Date(sp.get("to")!) : new Date(from.getTime() + 14 * 86_400_000);
  const capped = new Date(Math.min(to.getTime(), from.getTime() + 62 * 86_400_000));
  const windows = await openWindowsFor(id, from, capped);
  return json({ windows: windows.map((w) => ({ start: new Date(w.start), end: new Date(w.end) })) });
});

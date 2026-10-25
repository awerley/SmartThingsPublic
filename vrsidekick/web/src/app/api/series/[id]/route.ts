import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { badRequest, forbidden, json, notFound, parseBody, route } from "@/lib/http";
import { cancelSeries } from "@/lib/services/jobs";
import { postJobNote } from "@/lib/services/conversations";

const schema = z.object({ action: z.literal("cancel") });

/** Either party may stop a recurring schedule; future occurrences are cancelled. */
export const PATCH = route(async (req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await parseBody(req, schema);
  const series = await db.recurringSeries.findUnique({ where: { id }, include: { sidekick: true } });
  if (!series) throw notFound();
  if (series.hostId !== user.id && series.sidekick.userId !== user.id && user.role !== "ADMIN") throw forbidden();
  if (series.status === "CANCELLED" || series.status === "DECLINED") throw badRequest("Schedule is not active");
  await cancelSeries(id);
  await postJobNote(series.hostId, series.sidekickId, user.id, `🚫 Recurring schedule stopped: "${series.title}".`);
  return json({ ok: true });
});

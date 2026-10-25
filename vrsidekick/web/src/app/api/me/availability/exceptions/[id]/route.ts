import { db } from "@/lib/db";
import { requireSidekick } from "@/lib/auth";
import { json, notFound, route } from "@/lib/http";

export const DELETE = route(async (_req, ctx) => {
  const { profile } = await requireSidekick();
  const { id } = await ctx.params;
  const { count } = await db.availabilityException.deleteMany({ where: { id, sidekickId: profile.id } });
  if (!count) throw notFound();
  return json({ ok: true });
});

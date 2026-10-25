import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { forbidden, json, notFound, parseBody, route } from "@/lib/http";
import { geocodeZip } from "@/lib/geo";
import { wantedAdSchema } from "@/lib/schemas";

export const GET = route(async (_req, ctx) => {
  await requireUser();
  const { id } = await ctx.params;
  const ad = await db.wantedAd.findUnique({
    where: { id },
    include: {
      taskType: { select: { id: true, name: true } },
      host: { select: { id: true, name: true } },
      property: { select: { id: true, name: true, city: true, state: true } },
    },
  });
  if (!ad) throw notFound();
  return json({ ad });
});

const patchSchema = wantedAdSchema.partial().extend({ status: z.enum(["OPEN", "FILLED", "CLOSED"]).optional() });

export const PATCH = route(async (req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const ad = await db.wantedAd.findUnique({ where: { id } });
  if (!ad) throw notFound();
  if (ad.hostId !== user.id && user.role !== "ADMIN") throw forbidden();
  const input = await parseBody(req, patchSchema);
  const geo = input.zip && input.zip !== ad.zip ? await geocodeZip(input.zip) : null;
  const updated = await db.wantedAd.update({
    where: { id },
    data: { ...input, ...(geo ? { lat: geo.lat, lng: geo.lng } : {}) },
  });
  return json({ ad: updated });
});

export const DELETE = route(async (_req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const ad = await db.wantedAd.findUnique({ where: { id } });
  if (!ad) throw notFound();
  if (ad.hostId !== user.id && user.role !== "ADMIN") throw forbidden();
  await db.wantedAd.delete({ where: { id } });
  return json({ ok: true });
});

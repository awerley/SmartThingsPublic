import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, notFound, parseBody, route } from "@/lib/http";
import { geocodeZip } from "@/lib/geo";
import { propertySchema } from "@/lib/schemas";

async function own(userId: string, id: string) {
  const p = await db.property.findUnique({ where: { id } });
  if (!p || p.hostId !== userId) throw notFound("Property not found");
  return p;
}

export const PUT = route(async (req, ctx) => {
  const user = await requireUser("HOST", "ADMIN");
  const { id } = await ctx.params;
  const existing = await own(user.id, id);
  const input = await parseBody(req, propertySchema);
  const geo = input.zip !== existing.zip ? await geocodeZip(input.zip) : null;
  const property = await db.property.update({
    where: { id },
    data: { ...input, ...(geo ? { lat: geo.lat, lng: geo.lng } : {}) },
  });
  return json({ property });
});

export const DELETE = route(async (_req, ctx) => {
  const user = await requireUser("HOST", "ADMIN");
  const { id } = await ctx.params;
  await own(user.id, id);
  await db.property.delete({ where: { id } });
  return json({ ok: true });
});

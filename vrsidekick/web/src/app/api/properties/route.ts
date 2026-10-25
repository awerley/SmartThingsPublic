import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, parseBody, route } from "@/lib/http";
import { geocodeZip } from "@/lib/geo";
import { propertySchema } from "@/lib/schemas";

export const GET = route(async () => {
  const user = await requireUser("HOST", "ADMIN");
  const properties = await db.property.findMany({ where: { hostId: user.id }, orderBy: { createdAt: "asc" } });
  return json({ properties });
});

export const POST = route(async (req) => {
  const user = await requireUser("HOST", "ADMIN");
  const input = await parseBody(req, propertySchema);
  const geo = await geocodeZip(input.zip);
  const property = await db.property.create({ data: { ...input, hostId: user.id, lat: geo?.lat, lng: geo?.lng } });
  return json({ property }, 201);
});

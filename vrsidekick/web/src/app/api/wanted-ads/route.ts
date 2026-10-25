import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, parseBody, route, searchParams } from "@/lib/http";
import { geocodeZip, milesBetween } from "@/lib/geo";
import { wantedAdSchema } from "@/lib/schemas";

const include = {
  taskType: { select: { id: true, name: true } },
  host: { select: { id: true, name: true } },
  property: { select: { id: true, name: true, city: true, state: true } },
} satisfies Prisma.WantedAdInclude;

/**
 * Sidekicks browse open "Sidekick wanted" ads, by default within their own service area.
 * Hosts get their own ads with ?mine=1.
 */
export const GET = route(async (req) => {
  const user = await requireUser();
  const sp = searchParams(req);
  if (sp.get("mine")) {
    const ads = await db.wantedAd.findMany({
      where: { hostId: user.id },
      include: { ...include, _count: { select: { conversations: true } } },
      orderBy: { createdAt: "desc" },
    });
    return json({ ads });
  }
  const where: Prisma.WantedAdWhereInput = { status: "OPEN", host: { status: "ACTIVE" } };
  if (sp.get("taskTypeId")) where.taskTypeId = sp.get("taskTypeId")!;
  const ads = await db.wantedAd.findMany({ where, include, orderBy: { createdAt: "desc" }, take: 300 });

  let center: { lat: number; lng: number } | null = null;
  let radius = Number(sp.get("radius") ?? 0) || 25;
  if (sp.get("zip")) center = await geocodeZip(sp.get("zip")!);
  else if (user.role === "SIDEKICK") {
    const sk = await db.sidekickProfile.findUnique({ where: { userId: user.id } });
    if (sk?.baseLat != null && sk.baseLng != null) {
      center = { lat: sk.baseLat, lng: sk.baseLng };
      if (!sp.get("radius")) radius = sk.serviceRadiusMiles;
    }
  }
  const results = ads
    .map((a) => ({
      ...a,
      distanceMiles:
        center && a.lat != null && a.lng != null
          ? Math.round(milesBetween(center, { lat: a.lat, lng: a.lng }) * 10) / 10
          : null,
    }))
    .filter((a) => !center || (a.distanceMiles != null && a.distanceMiles <= radius));
  return json({ ads: results });
});

export const POST = route(async (req) => {
  const user = await requireUser("HOST");
  const input = await parseBody(req, wantedAdSchema);
  const geo = await geocodeZip(input.zip);
  const ad = await db.wantedAd.create({
    data: { ...input, hostId: user.id, lat: geo?.lat, lng: geo?.lng },
    include,
  });
  return json({ ad }, 201);
});

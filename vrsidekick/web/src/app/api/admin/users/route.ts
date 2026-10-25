import type { Prisma, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, route, searchParams } from "@/lib/http";

export const GET = route(async (req) => {
  await requireUser("ADMIN");
  const sp = searchParams(req);
  const q = sp.get("q");
  const where: Prisma.UserWhereInput = {
    ...(sp.get("role") ? { role: sp.get("role") as Role } : {}),
    ...(q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
      : {}),
  };
  const users = await db.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      hasPaymentMethod: true,
      sidekick: { select: { id: true, displayName: true, providerType: true, payoutsEnabled: true, published: true, ratingAvg: true } },
      _count: { select: { hostJobs: true, properties: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return json({ users });
});

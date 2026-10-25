import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, route } from "@/lib/http";

export const GET = route(async () => {
  const user = await requireUser();
  const series = await db.recurringSeries.findMany({
    where: user.role === "SIDEKICK" ? { sidekick: { userId: user.id } } : { hostId: user.id },
    include: {
      property: { select: { name: true, city: true } },
      taskType: { select: { name: true } },
      sidekick: { select: { id: true, displayName: true } },
      host: { select: { name: true } },
      jobs: { where: { startAt: { gte: new Date() }, status: "ACCEPTED" }, orderBy: { startAt: "asc" }, take: 1, select: { id: true, startAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return json({ series });
});

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, route } from "@/lib/http";

export const GET = route(async () => {
  await requireUser("ADMIN");
  const ads = await db.wantedAd.findMany({
    include: { taskType: { select: { name: true } }, host: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return json({ ads });
});

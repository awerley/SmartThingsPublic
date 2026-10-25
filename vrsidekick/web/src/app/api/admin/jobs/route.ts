import type { JobStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, route, searchParams } from "@/lib/http";
import { jobInclude } from "@/lib/services/jobs";

export const GET = route(async (req) => {
  await requireUser("ADMIN");
  const status = searchParams(req).get("status");
  const jobs = await db.job.findMany({
    where: status ? { status: status as JobStatus } : {},
    include: jobInclude,
    orderBy: { startAt: "desc" },
    take: 300,
  });
  return json({ jobs });
});

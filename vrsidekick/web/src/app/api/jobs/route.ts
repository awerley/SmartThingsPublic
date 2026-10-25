import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, parseBody, route, searchParams } from "@/lib/http";
import { jobInclude, requestJob } from "@/lib/services/jobs";

/** Jobs for the signed-in host or sidekick. Optional filters: status, from, to. */
export const GET = route(async (req) => {
  const user = await requireUser();
  const sp = searchParams(req);
  const where: Prisma.JobWhereInput =
    user.role === "SIDEKICK" ? { sidekick: { userId: user.id } } : { hostId: user.id };
  const status = sp.get("status");
  if (status) where.status = { in: status.split(",") as Prisma.EnumJobStatusFilter["in"] };
  if (sp.get("from")) where.endAt = { gte: new Date(sp.get("from")!) };
  if (sp.get("to")) where.startAt = { lt: new Date(sp.get("to")!) };
  const jobs = await db.job.findMany({ where, include: jobInclude, orderBy: { startAt: "asc" }, take: 500 });
  return json({ jobs });
});

const schema = z.object({
  sidekickId: z.string(),
  propertyId: z.string(),
  taskTypeId: z.string(),
  title: z.string().min(2).max(140),
  description: z.string().max(4000).optional(),
  startAt: z.coerce.date(),
  durationMinutes: z.number().int().min(15).max(24 * 60),
  estimatedHours: z.number().min(0.25).max(24).optional(),
  recurrence: z
    .object({ frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]), endsOn: z.coerce.date().nullable().optional() })
    .nullable()
    .optional(),
});

export const POST = route(async (req) => {
  const host = await requireUser("HOST");
  const input = await parseBody(req, schema);
  const job = await requestJob(host, input);
  return json({ job: await db.job.findUniqueOrThrow({ where: { id: job.id }, include: jobInclude }) }, 201);
});

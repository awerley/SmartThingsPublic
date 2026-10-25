import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { forbidden, json, notFound, parseBody, route } from "@/lib/http";
import { acceptJob, cancelJob, canSeeJob, completeJob, declineJob, jobInclude } from "@/lib/services/jobs";

export const GET = route(async (_req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const job = await db.job.findUnique({ where: { id }, include: jobInclude });
  if (!job) throw notFound("Job not found");
  if (!canSeeJob(user, job)) throw forbidden();
  return json({ job });
});

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept") }),
  z.object({ action: z.literal("decline"), reason: z.string().max(500).optional() }),
  z.object({ action: z.literal("cancel"), wholeSeries: z.boolean().optional(), reason: z.string().max(500).optional() }),
  z.object({ action: z.literal("complete"), actualHours: z.number().min(0.25).max(24).optional() }),
]);

export const PATCH = route(async (req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const input = await parseBody(req, schema);
  const job =
    input.action === "accept"
      ? await acceptJob(user, id)
      : input.action === "decline"
        ? await declineJob(user, id, input.reason)
        : input.action === "cancel"
          ? await cancelJob(user, id, input)
          : await completeJob(user, id, input.actualHours);
  return json({ job });
});

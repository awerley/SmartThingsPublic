import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { badRequest, forbidden, json, notFound, parseBody, route } from "@/lib/http";
import { recomputeRating } from "@/lib/services/sidekicks";

const schema = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().max(2000).optional() });

/** Host reviews the sidekick after a completed job. */
export const POST = route(async (req, ctx) => {
  const user = await requireUser("HOST");
  const { id } = await ctx.params;
  const input = await parseBody(req, schema);
  const job = await db.job.findUnique({ where: { id }, include: { review: true } });
  if (!job) throw notFound();
  if (job.hostId !== user.id) throw forbidden();
  if (job.status !== "COMPLETED") throw badRequest("You can review once the job is completed");
  if (job.review) throw badRequest("Already reviewed");
  const review = await db.review.create({ data: { ...input, jobId: id, authorId: user.id } });
  await recomputeRating(job.sidekickId);
  return json({ review }, 201);
});

import { db } from "@/lib/db";
import { json, notFound, route } from "@/lib/http";
import { serializeSidekick, sidekickInclude } from "@/lib/services/sidekicks";

export const GET = route(async (_req, ctx) => {
  const { id } = await ctx.params;
  const p = await db.sidekickProfile.findUnique({ where: { id }, include: sidekickInclude });
  if (!p || !p.published) throw notFound("Sidekick not found");
  const reviews = await db.review.findMany({
    where: { job: { sidekickId: id } },
    include: { author: { select: { name: true } }, job: { select: { taskType: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return json({
    sidekick: serializeSidekick(p),
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      author: r.author.name.split(" ")[0],
      taskType: r.job.taskType.name,
      createdAt: r.createdAt,
    })),
  });
});

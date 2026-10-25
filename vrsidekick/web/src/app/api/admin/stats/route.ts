import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, route } from "@/lib/http";

export const GET = route(async () => {
  await requireUser("ADMIN");
  const [hosts, sidekicks, openRequests, upcoming, completed, revenue, openAds, activeSeries] = await Promise.all([
    db.user.count({ where: { role: "HOST" } }),
    db.user.count({ where: { role: "SIDEKICK" } }),
    db.job.count({ where: { status: "REQUESTED" } }),
    db.job.count({ where: { status: "ACCEPTED", startAt: { gte: new Date() } } }),
    db.job.count({ where: { status: "COMPLETED" } }),
    db.job.aggregate({ where: { paymentStatus: "PAID" }, _sum: { serviceFeeCents: true, totalCents: true } }),
    db.wantedAd.count({ where: { status: "OPEN" } }),
    db.recurringSeries.count({ where: { status: "ACTIVE" } }),
  ]);
  return json({
    hosts,
    sidekicks,
    openRequests,
    upcoming,
    completed,
    openAds,
    activeSeries,
    feeRevenueCents: revenue._sum.serviceFeeCents ?? 0,
    grossVolumeCents: revenue._sum.totalCents ?? 0,
  });
});

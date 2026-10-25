import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, route, searchParams } from "@/lib/http";
import { openWindowsFor } from "@/lib/services/sidekicks";

/**
 * Calendar feed for the signed-in user: scheduled jobs, plus (for sidekicks)
 * open availability windows and blocked/extra time.
 */
export const GET = route(async (req) => {
  const user = await requireUser();
  const sp = searchParams(req);
  const from = sp.get("from") ? new Date(sp.get("from")!) : new Date();
  const to = sp.get("to") ? new Date(sp.get("to")!) : new Date(from.getTime() + 31 * 86_400_000);
  const sidekick = user.role === "SIDEKICK" ? await db.sidekickProfile.findUnique({ where: { userId: user.id } }) : null;

  const jobs = await db.job.findMany({
    where: {
      ...(sidekick ? { sidekickId: sidekick.id } : { hostId: user.id }),
      status: { in: ["REQUESTED", "ACCEPTED", "COMPLETED"] },
      startAt: { lt: to },
      endAt: { gt: from },
    },
    include: {
      property: { select: { name: true, city: true } },
      taskType: { select: { name: true } },
      sidekick: { select: { displayName: true } },
      host: { select: { name: true } },
    },
    orderBy: { startAt: "asc" },
  });
  const events = jobs.map((j) => ({
    id: j.id,
    kind: "job" as const,
    title: j.title,
    start: j.startAt,
    end: j.endAt,
    status: j.status,
    recurring: !!j.seriesId,
    subtitle: `${j.taskType.name} · ${j.property.name}${sidekick ? ` · ${j.host.name}` : ` · ${j.sidekick.displayName}`}`,
  }));
  if (!sidekick) return json({ events });

  const [windows, exceptions] = await Promise.all([
    openWindowsFor(sidekick.id, from, to),
    db.availabilityException.findMany({ where: { sidekickId: sidekick.id, startAt: { lt: to }, endAt: { gt: from } } }),
  ]);
  return json({
    events,
    availability: windows.map((w) => ({ start: new Date(w.start), end: new Date(w.end) })),
    exceptions,
    timezone: sidekick.timezone,
  });
});

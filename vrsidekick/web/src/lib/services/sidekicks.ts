import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { computeOpenWindows } from "../availability";
import { coversLocation, geocodeZip, milesBetween } from "../geo";

export const sidekickInclude = {
  user: { select: { id: true, name: true, avatarUrl: true, email: true } },
  tasks: { include: { taskType: true } },
  skills: { include: { skill: true } },
  tools: { include: { tool: true } },
} satisfies Prisma.SidekickProfileInclude;

export type SidekickWithRelations = Prisma.SidekickProfileGetPayload<{ include: typeof sidekickInclude }>;

export function serializeSidekick(p: SidekickWithRelations, distanceMiles?: number | null) {
  return {
    id: p.id,
    userId: p.userId,
    displayName: p.displayName,
    providerType: p.providerType,
    companyName: p.companyName,
    bio: p.bio,
    avatarUrl: p.user.avatarUrl,
    yearsExperience: p.yearsExperience,
    insured: p.insured,
    baseZip: p.baseZip,
    serviceRadiusMiles: p.serviceRadiusMiles,
    serviceZips: p.serviceZips,
    timezone: p.timezone,
    travelBufferMins: p.travelBufferMins,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    payoutsEnabled: p.payoutsEnabled,
    published: p.published,
    distanceMiles: distanceMiles ?? null,
    tasks: p.tasks
      .filter((t) => t.taskType.active)
      .map((t) => ({
        id: t.id,
        taskTypeId: t.taskTypeId,
        taskType: t.taskType.name,
        rateType: t.rateType,
        rateCents: t.rateCents,
        notes: t.notes,
      })),
    skills: p.skills.filter((s) => s.skill.active).map((s) => ({ id: s.skillId, name: s.skill.name })),
    tools: p.tools.filter((t) => t.tool.active).map((t) => ({ id: t.toolId, name: t.tool.name })),
  };
}

export async function searchSidekicks(f: {
  zip?: string | null;
  taskTypeId?: string | null;
  skillId?: string | null;
  toolId?: string | null;
  q?: string | null;
}) {
  const where: Prisma.SidekickProfileWhereInput = {
    published: true,
    user: { status: "ACTIVE" },
    ...(f.taskTypeId ? { tasks: { some: { taskTypeId: f.taskTypeId } } } : {}),
    ...(f.skillId ? { skills: { some: { skillId: f.skillId } } } : {}),
    ...(f.toolId ? { tools: { some: { toolId: f.toolId } } } : {}),
    ...(f.q
      ? {
          OR: [
            { displayName: { contains: f.q, mode: "insensitive" } },
            { companyName: { contains: f.q, mode: "insensitive" } },
            { bio: { contains: f.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const all = await db.sidekickProfile.findMany({
    where,
    include: sidekickInclude,
    orderBy: [{ ratingAvg: "desc" }, { createdAt: "asc" }],
    take: 200,
  });
  if (!f.zip) return all.map((p) => serializeSidekick(p));

  const point = await geocodeZip(f.zip);
  return all
    .filter((p) => coversLocation(p, f.zip!, point))
    .map((p) => {
      const dist = point && p.baseLat != null && p.baseLng != null
        ? Math.round(milesBetween(point, { lat: p.baseLat, lng: p.baseLng }) * 10) / 10
        : null;
      return serializeSidekick(p, dist);
    })
    .sort((a, b) => (a.distanceMiles ?? 999) - (b.distanceMiles ?? 999));
}

/** Busy jobs: anything requested or accepted that hasn't been declined/cancelled. */
export function busyJobsWhere(sidekickId: string, from: Date, to: Date, excludeJobId?: string): Prisma.JobWhereInput {
  return {
    sidekickId,
    status: { in: ["REQUESTED", "ACCEPTED"] },
    startAt: { lt: to },
    endAt: { gt: from },
    ...(excludeJobId ? { id: { not: excludeJobId } } : {}),
  };
}

export async function openWindowsFor(sidekickId: string, from: Date, to: Date, excludeJobId?: string) {
  const profile = await db.sidekickProfile.findUniqueOrThrow({
    where: { id: sidekickId },
    include: {
      rules: true,
      exceptions: { where: { startAt: { lt: to }, endAt: { gt: from } } },
    },
  });
  const busy = await db.job.findMany({
    where: busyJobsWhere(sidekickId, from, to, excludeJobId),
    select: { startAt: true, endAt: true },
  });
  return computeOpenWindows({
    rules: profile.rules,
    exceptions: profile.exceptions,
    busy,
    timezone: profile.timezone,
    from,
    to,
    bufferMins: profile.travelBufferMins,
  });
}

export async function recomputeRating(sidekickId: string) {
  const agg = await db.review.aggregate({
    where: { job: { sidekickId } },
    _avg: { rating: true },
    _count: true,
  });
  await db.sidekickProfile.update({
    where: { id: sidekickId },
    data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count },
  });
}

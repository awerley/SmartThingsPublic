import type { Frequency, Job, Prisma, RecurringSeries, User } from "@prisma/client";
import { DateTime } from "luxon";
import { db } from "../db";
import { fitsInWindows } from "../availability";
import { billableHours, formatMoney, priceJob } from "../fees";
import { badRequest, forbidden, notFound } from "../http";
import { occurrences } from "../recurrence";
import { getSettings } from "../settings";
import { chargeJob, paymentsEnabled } from "../stripe";
import { openWindowsFor } from "./sidekicks";
import { postJobNote } from "./conversations";

export const jobInclude = {
  host: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
  sidekick: { select: { id: true, userId: true, displayName: true, companyName: true, timezone: true } },
  property: true,
  taskType: { select: { id: true, name: true } },
  series: { select: { id: true, frequency: true, status: true, endsOn: true } },
  review: true,
} satisfies Prisma.JobInclude;

export type JobInput = {
  sidekickId: string;
  propertyId: string;
  taskTypeId: string;
  title: string;
  description?: string;
  startAt: Date;
  durationMinutes: number;
  estimatedHours?: number;
  recurrence?: { frequency: Frequency; endsOn?: Date | null } | null;
};

const fmtWhen = (d: Date, tz: string) =>
  DateTime.fromJSDate(d, { zone: tz }).toFormat("ccc LLL d, h:mm a ZZZZ");

/** Host requests a sidekick for a one-time or recurring job. */
export async function requestJob(host: User, input: JobInput) {
  if (paymentsEnabled() && !host.hasPaymentMethod) {
    throw badRequest("Add a payment method before requesting a Sidekick");
  }
  const [property, offer, settings] = await Promise.all([
    db.property.findUnique({ where: { id: input.propertyId } }),
    db.sidekickTask.findUnique({
      where: { sidekickId_taskTypeId: { sidekickId: input.sidekickId, taskTypeId: input.taskTypeId } },
      include: { sidekick: { include: { user: true } }, taskType: true },
    }),
    getSettings(),
  ]);
  if (!property || property.hostId !== host.id) throw notFound("Property not found");
  if (!offer || !offer.taskType.active) throw badRequest("This Sidekick doesn't offer that task");
  if (offer.sidekick.user.status !== "ACTIVE") throw badRequest("This Sidekick is unavailable");
  if (input.startAt.getTime() < Date.now()) throw badRequest("Pick a start time in the future");

  const endAt = new Date(input.startAt.getTime() + input.durationMinutes * 60_000);
  const windows = await openWindowsFor(input.sidekickId, input.startAt, endAt);
  if (!fitsInWindows(windows, input.startAt, endAt)) {
    throw badRequest("The Sidekick isn't available for that time window");
  }

  const recurring = !!input.recurrence;
  const pricing = priceJob(
    {
      rateType: offer.rateType,
      rateCents: offer.rateCents,
      hours: billableHours({ estimatedHours: input.estimatedHours, startAt: input.startAt, endAt }),
      recurring,
    },
    settings,
  );

  const job = await db.$transaction(async (tx) => {
    let seriesId: string | undefined;
    if (input.recurrence) {
      const series = await tx.recurringSeries.create({
        data: {
          hostId: host.id,
          sidekickId: input.sidekickId,
          propertyId: input.propertyId,
          taskTypeId: input.taskTypeId,
          title: input.title,
          description: input.description,
          frequency: input.recurrence.frequency,
          endsOn: input.recurrence.endsOn ?? null,
          firstStartAt: input.startAt,
          durationMinutes: input.durationMinutes,
          rateType: offer.rateType,
          rateCents: offer.rateCents,
          estimatedHours: input.estimatedHours,
        },
      });
      seriesId = series.id;
    }
    return tx.job.create({
      data: {
        hostId: host.id,
        sidekickId: input.sidekickId,
        propertyId: input.propertyId,
        taskTypeId: input.taskTypeId,
        seriesId,
        title: input.title,
        description: input.description,
        startAt: input.startAt,
        endAt,
        rateType: offer.rateType,
        rateCents: offer.rateCents,
        estimatedHours: input.estimatedHours,
        ...pricing,
      },
    });
  });

  const repeat = input.recurrence ? ` (repeats ${input.recurrence.frequency.toLowerCase()})` : "";
  await postJobNote(
    host.id,
    input.sidekickId,
    host.id,
    `📋 Job requested: "${job.title}" at ${property.name} on ${fmtWhen(job.startAt, offer.sidekick.timezone)}${repeat}. Estimated total ${formatMoney(job.totalCents)}.`,
  );
  return job;
}

async function loadJobForUser(user: User, jobId: string) {
  const job = await db.job.findUnique({
    where: { id: jobId },
    include: { host: true, sidekick: true, series: true, property: true },
  });
  if (!job) throw notFound("Job not found");
  const isHost = job.hostId === user.id;
  const isSidekick = job.sidekick.userId === user.id;
  if (!isHost && !isSidekick && user.role !== "ADMIN") throw forbidden();
  return { job, isHost, isSidekick };
}

export async function acceptJob(user: User, jobId: string) {
  const { job, isSidekick } = await loadJobForUser(user, jobId);
  if (!isSidekick) throw forbidden("Only the Sidekick can accept");
  if (job.status !== "REQUESTED") throw badRequest(`Job is already ${job.status.toLowerCase()}`);
  if (paymentsEnabled() && !job.sidekick.payoutsEnabled) {
    throw badRequest("Finish payout setup before accepting jobs");
  }
  await db.job.update({ where: { id: job.id }, data: { status: "ACCEPTED" } });
  if (job.series && job.series.status === "REQUESTED") {
    const series = await db.recurringSeries.update({ where: { id: job.series.id }, data: { status: "ACTIVE" } });
    await generateSeriesJobs(series);
  }
  await postJobNote(job.hostId, job.sidekickId, user.id, `✅ Accepted: "${job.title}"${job.series ? " and its recurring schedule" : ""}.`);
  return db.job.findUniqueOrThrow({ where: { id: job.id }, include: jobInclude });
}

export async function declineJob(user: User, jobId: string, reason?: string) {
  const { job, isSidekick } = await loadJobForUser(user, jobId);
  if (!isSidekick) throw forbidden("Only the Sidekick can decline");
  if (job.status !== "REQUESTED") throw badRequest(`Job is already ${job.status.toLowerCase()}`);
  await db.job.update({ where: { id: job.id }, data: { status: "DECLINED" } });
  if (job.series?.status === "REQUESTED") {
    await db.recurringSeries.update({ where: { id: job.series.id }, data: { status: "DECLINED" } });
  }
  await postJobNote(job.hostId, job.sidekickId, user.id, `❌ Declined: "${job.title}"${reason ? ` — ${reason}` : ""}`);
  return db.job.findUniqueOrThrow({ where: { id: job.id }, include: jobInclude });
}

export async function cancelJob(user: User, jobId: string, opts: { wholeSeries?: boolean; reason?: string }) {
  const { job } = await loadJobForUser(user, jobId);
  if (!["REQUESTED", "ACCEPTED"].includes(job.status)) throw badRequest("Job can no longer be cancelled");
  if (opts.wholeSeries && job.series) {
    await cancelSeries(job.series.id);
  } else {
    await db.job.update({ where: { id: job.id }, data: { status: "CANCELLED" } });
  }
  await postJobNote(
    job.hostId,
    job.sidekickId,
    user.id,
    `🚫 Cancelled${opts.wholeSeries && job.series ? " recurring schedule" : ""}: "${job.title}"${opts.reason ? ` — ${opts.reason}` : ""}`,
  );
  return db.job.findUniqueOrThrow({ where: { id: job.id }, include: jobInclude });
}

export async function cancelSeries(seriesId: string) {
  await db.$transaction([
    db.recurringSeries.update({ where: { id: seriesId }, data: { status: "CANCELLED" } }),
    db.job.updateMany({
      where: { seriesId, status: { in: ["REQUESTED", "ACCEPTED"] }, startAt: { gte: new Date() } },
      data: { status: "CANCELLED" },
    }),
  ]);
}

/** Sidekick marks the job done; the final price is computed and the host is charged. */
export async function completeJob(user: User, jobId: string, actualHours?: number) {
  const { job, isSidekick } = await loadJobForUser(user, jobId);
  if (!isSidekick && user.role !== "ADMIN") throw forbidden("Only the Sidekick can complete");
  if (job.status !== "ACCEPTED") throw badRequest("Only accepted jobs can be completed");
  if (job.startAt.getTime() > Date.now()) throw badRequest("This job hasn't started yet");
  const settings = await getSettings();
  const pricing = priceJob(
    {
      rateType: job.rateType,
      rateCents: job.rateCents,
      hours: billableHours({ actualHours, estimatedHours: job.estimatedHours, startAt: job.startAt, endAt: job.endAt }),
      recurring: !!job.seriesId,
    },
    settings,
  );
  const updated = await db.job.update({
    where: { id: job.id },
    data: { status: "COMPLETED", completedAt: new Date(), actualHours: actualHours ?? null, ...pricing },
    include: { host: true, sidekick: true },
  });
  await chargeJob(updated);
  await postJobNote(
    job.hostId,
    job.sidekickId,
    user.id,
    `🏁 Completed: "${job.title}". Total charged ${formatMoney(pricing.totalCents)} (includes ${formatMoney(pricing.serviceFeeCents)} service fee).`,
  );
  return db.job.findUniqueOrThrow({ where: { id: job.id }, include: jobInclude });
}

/**
 * Materialises upcoming occurrences of an active recurring series as accepted jobs,
 * up to the admin-configured horizon. Occurrences that collide with the sidekick's
 * other bookings or blocked time are skipped and noted in the chat.
 */
export async function generateSeriesJobs(series: RecurringSeries) {
  if (series.status !== "ACTIVE") return 0;
  const settings = await getSettings();
  const sidekick = await db.sidekickProfile.findUniqueOrThrow({ where: { id: series.sidekickId } });
  const horizon = new Date(Date.now() + settings.recurringHorizonDays * 86_400_000);
  const from = series.generatedUntil ?? series.firstStartAt;
  const starts = occurrences({
    firstStartAt: series.firstStartAt,
    frequency: series.frequency,
    timezone: sidekick.timezone,
    from,
    until: horizon,
    endsOn: series.endsOn,
  });
  const existing = new Set(
    (await db.job.findMany({ where: { seriesId: series.id }, select: { startAt: true } })).map((j) =>
      j.startAt.getTime(),
    ),
  );
  let created = 0;
  const skipped: Date[] = [];
  for (const startAt of starts) {
    if (existing.has(startAt.getTime()) || startAt.getTime() < Date.now()) continue;
    const endAt = new Date(startAt.getTime() + series.durationMinutes * 60_000);
    const windows = await openWindowsFor(series.sidekickId, startAt, endAt);
    if (!fitsInWindows(windows, startAt, endAt)) {
      skipped.push(startAt);
      continue;
    }
    const pricing = priceJob(
      {
        rateType: series.rateType,
        rateCents: series.rateCents,
        hours: billableHours({ estimatedHours: series.estimatedHours, startAt, endAt }),
        recurring: true,
      },
      settings,
    );
    await db.job.create({
      data: {
        hostId: series.hostId,
        sidekickId: series.sidekickId,
        propertyId: series.propertyId,
        taskTypeId: series.taskTypeId,
        seriesId: series.id,
        title: series.title,
        description: series.description,
        startAt,
        endAt,
        status: "ACCEPTED",
        rateType: series.rateType,
        rateCents: series.rateCents,
        estimatedHours: series.estimatedHours,
        ...pricing,
      },
    });
    created++;
  }
  await db.recurringSeries.update({ where: { id: series.id }, data: { generatedUntil: horizon } });
  if (skipped.length) {
    await postJobNote(
      series.hostId,
      series.sidekickId,
      sidekick.userId,
      `⚠️ "${series.title}" could not be auto-scheduled on ${skipped
        .map((d) => fmtWhen(d, sidekick.timezone))
        .join("; ")} because the Sidekick is unavailable. Please arrange an alternate time.`,
    );
  }
  return created;
}

export async function extendAllSeries() {
  const active = await db.recurringSeries.findMany({ where: { status: "ACTIVE" } });
  let created = 0;
  for (const s of active) created += await generateSeriesJobs(s);
  return { series: active.length, jobsCreated: created };
}

export function canSeeJob(user: User, job: Job & { sidekick: { userId: string } }) {
  return user.role === "ADMIN" || job.hostId === user.id || job.sidekick.userId === user.id;
}

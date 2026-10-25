import { z } from "zod";
import { db } from "@/lib/db";
import { requireSidekick } from "@/lib/auth";
import { json, parseBody, route, searchParams } from "@/lib/http";
import { openWindowsFor } from "@/lib/services/sidekicks";

export const GET = route(async (req) => {
  const { profile } = await requireSidekick();
  const sp = searchParams(req);
  const from = sp.get("from") ? new Date(sp.get("from")!) : new Date();
  const to = sp.get("to") ? new Date(sp.get("to")!) : new Date(from.getTime() + 14 * 86_400_000);
  const [rules, exceptions, windows] = await Promise.all([
    db.availabilityRule.findMany({ where: { sidekickId: profile.id }, orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }] }),
    db.availabilityException.findMany({
      where: { sidekickId: profile.id, endAt: { gte: new Date() } },
      orderBy: { startAt: "asc" },
    }),
    openWindowsFor(profile.id, from, to),
  ]);
  return json({
    timezone: profile.timezone,
    travelBufferMins: profile.travelBufferMins,
    rules,
    exceptions,
    windows: windows.map((w) => ({ start: new Date(w.start), end: new Date(w.end) })),
  });
});

const schema = z.object({
  rules: z
    .array(
      z
        .object({
          dayOfWeek: z.number().int().min(1).max(7),
          startMinute: z.number().int().min(0).max(1440),
          endMinute: z.number().int().min(0).max(1440),
        })
        .refine((r) => r.endMinute > r.startMinute, "End must be after start"),
    )
    .max(50),
});

/** Replaces the standard weekly schedule. */
export const PUT = route(async (req) => {
  const { profile } = await requireSidekick();
  const { rules } = await parseBody(req, schema);
  await db.$transaction([
    db.availabilityRule.deleteMany({ where: { sidekickId: profile.id } }),
    db.availabilityRule.createMany({ data: rules.map((r) => ({ ...r, sidekickId: profile.id })) }),
  ]);
  return json({ rules: await db.availabilityRule.findMany({ where: { sidekickId: profile.id } }) });
});

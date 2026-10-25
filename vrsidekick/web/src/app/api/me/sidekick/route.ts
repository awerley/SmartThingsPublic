import { z } from "zod";
import { db } from "@/lib/db";
import { requireSidekick } from "@/lib/auth";
import { json, parseBody, route } from "@/lib/http";
import { geocodeZip, normalizeZip } from "@/lib/geo";
import { serializeSidekick, sidekickInclude } from "@/lib/services/sidekicks";

async function load(id: string) {
  const p = await db.sidekickProfile.findUniqueOrThrow({ where: { id }, include: sidekickInclude });
  return serializeSidekick(p);
}

export const GET = route(async () => {
  const { profile } = await requireSidekick();
  return json({ profile: await load(profile.id) });
});

const schema = z.object({
  displayName: z.string().min(2).max(120),
  providerType: z.enum(["INDIVIDUAL", "COMPANY"]),
  companyName: z.string().max(120).nullable().optional(),
  bio: z.string().max(4000).nullable().optional(),
  yearsExperience: z.number().int().min(0).max(80).nullable().optional(),
  insured: z.boolean().optional(),
  baseZip: z.string().regex(/^\d{5}$/).nullable().optional(),
  serviceRadiusMiles: z.number().int().min(1).max(250),
  serviceZips: z.array(z.string().regex(/^\d{5}$/)).max(200),
  timezone: z.string(),
  travelBufferMins: z.number().int().min(0).max(240),
  published: z.boolean().optional(),
  tasks: z
    .array(
      z.object({
        taskTypeId: z.string(),
        rateType: z.enum(["HOURLY", "FLAT"]),
        rateCents: z.number().int().min(100).max(10_000_00),
        notes: z.string().max(500).nullable().optional(),
      }),
    )
    .max(100),
  skillIds: z.array(z.string()).max(200),
  toolIds: z.array(z.string()).max(200),
});

export const PUT = route(async (req) => {
  const { profile } = await requireSidekick();
  const input = await parseBody(req, schema);
  const geo = input.baseZip && input.baseZip !== profile.baseZip ? await geocodeZip(input.baseZip) : null;
  await db.$transaction([
    db.sidekickProfile.update({
      where: { id: profile.id },
      data: {
        displayName: input.displayName,
        providerType: input.providerType,
        companyName: input.companyName,
        bio: input.bio,
        yearsExperience: input.yearsExperience,
        insured: input.insured,
        baseZip: input.baseZip,
        ...(input.baseZip ? (geo ? { baseLat: geo.lat, baseLng: geo.lng } : {}) : { baseLat: null, baseLng: null }),
        serviceRadiusMiles: input.serviceRadiusMiles,
        serviceZips: [...new Set(input.serviceZips.map(normalizeZip))],
        timezone: input.timezone,
        travelBufferMins: input.travelBufferMins,
        published: input.published,
      },
    }),
    db.sidekickTask.deleteMany({ where: { sidekickId: profile.id } }),
    db.sidekickTask.createMany({ data: input.tasks.map((t) => ({ ...t, sidekickId: profile.id })) }),
    db.sidekickSkill.deleteMany({ where: { sidekickId: profile.id } }),
    db.sidekickSkill.createMany({ data: input.skillIds.map((skillId) => ({ skillId, sidekickId: profile.id })) }),
    db.sidekickTool.deleteMany({ where: { sidekickId: profile.id } }),
    db.sidekickTool.createMany({ data: input.toolIds.map((toolId) => ({ toolId, sidekickId: profile.id })) }),
  ]);
  return json({ profile: await load(profile.id) });
});

import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, parseBody, route } from "@/lib/http";
import { getSettings } from "@/lib/settings";

export const GET = route(async () => {
  await requireUser("ADMIN");
  return json({ settings: await getSettings() });
});

const schema = z.object({
  oneTimeFeePercent: z.number().min(0).max(50),
  recurringFeePercent: z.number().min(0).max(50),
  minimumFeeCents: z.number().int().min(0).max(100_00),
  recurringHorizonDays: z.number().int().min(7).max(180),
});

/** Service fees apply to jobs requested after the change; existing jobs keep their quoted fee %. */
export const PUT = route(async (req) => {
  await requireUser("ADMIN");
  const data = await parseBody(req, schema);
  const settings = await db.platformSettings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
  return json({ settings });
});

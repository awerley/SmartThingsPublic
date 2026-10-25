import { z } from "zod";
import { db } from "@/lib/db";
import { requireSidekick } from "@/lib/auth";
import { json, parseBody, route } from "@/lib/http";

const schema = z
  .object({
    kind: z.enum(["BLOCK", "EXTRA"]),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    reason: z.string().max(200).optional(),
  })
  .refine((e) => e.endAt > e.startAt, "End must be after start");

/** Block out time (travel, appointments) or add a one-off availability window. */
export const POST = route(async (req) => {
  const { profile } = await requireSidekick();
  const input = await parseBody(req, schema);
  const exception = await db.availabilityException.create({ data: { ...input, sidekickId: profile.id } });
  return json({ exception }, 201);
});

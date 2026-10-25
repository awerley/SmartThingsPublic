import { z } from "zod";
import { db } from "@/lib/db";
import { currentUser, publicUser, requireUser } from "@/lib/auth";
import { json, parseBody, route } from "@/lib/http";
import { paymentsEnabled } from "@/lib/stripe";

export const GET = route(async () => {
  const user = await currentUser();
  if (!user) return json({ user: null, paymentsEnabled: paymentsEnabled() });
  const sidekick = await db.sidekickProfile.findUnique({ where: { userId: user.id }, select: { id: true, payoutsEnabled: true, displayName: true } });
  return json({ user: publicUser(user), sidekick, paymentsEnabled: paymentsEnabled() });
});

const schema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(30).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export const PATCH = route(async (req) => {
  const user = await requireUser();
  const data = await parseBody(req, schema);
  const updated = await db.user.update({ where: { id: user.id }, data });
  return json({ user: publicUser(updated) });
});

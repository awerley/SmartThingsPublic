import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { badRequest, json, parseBody, route } from "@/lib/http";

const schema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  role: z.enum(["HOST", "SIDEKICK", "ADMIN"]).optional(),
  published: z.boolean().optional(),
});

export const PATCH = route(async (req, ctx) => {
  const admin = await requireUser("ADMIN");
  const { id } = await ctx.params;
  const input = await parseBody(req, schema);
  if (id === admin.id && (input.status === "SUSPENDED" || (input.role && input.role !== "ADMIN"))) {
    throw badRequest("You can't suspend or demote yourself");
  }
  const user = await db.user.update({
    where: { id },
    data: { status: input.status, role: input.role },
    include: { sidekick: true },
  });
  if (input.role === "SIDEKICK" && !user.sidekick) {
    await db.sidekickProfile.create({ data: { userId: id, displayName: user.name, serviceZips: [] } });
  }
  if (input.published !== undefined) {
    await db.sidekickProfile.updateMany({ where: { userId: id }, data: { published: input.published } });
  }
  return json({ ok: true });
});

export const DELETE = route(async (_req, ctx) => {
  const admin = await requireUser("ADMIN");
  const { id } = await ctx.params;
  if (id === admin.id) throw badRequest("You can't delete yourself");
  await db.user.delete({ where: { id } });
  return json({ ok: true });
});

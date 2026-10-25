import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { json, parseBody, route } from "@/lib/http";
import { catalogKind, slugify } from "@/lib/catalog";

const schema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
  icon: z.string().max(8).nullable().optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const PATCH = route(async (req, ctx) => {
  await requireUser("ADMIN");
  const { kind, id } = await ctx.params;
  const input = await parseBody(req, schema);
  const item = await catalogKind(kind).update(id, { ...input, ...(input.name ? { slug: slugify(input.name) } : {}) });
  return json({ item });
});

/** Hard delete. Items already used by jobs or ads can only be deactivated. */
export const DELETE = route(async (_req, ctx) => {
  await requireUser("ADMIN");
  const { kind, id } = await ctx.params;
  await catalogKind(kind).remove(id);
  return json({ ok: true });
});

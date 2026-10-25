import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { json, parseBody, route } from "@/lib/http";
import { catalogKind, slugify } from "@/lib/catalog";

/** Admin list of task types / skills / tools, including inactive ones. */
export const GET = route(async (_req, ctx) => {
  await requireUser("ADMIN");
  const { kind } = await ctx.params;
  const repo = catalogKind(kind);
  return json({ items: await repo.list() });
});

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().max(500).nullable().optional(),
  icon: z.string().max(8).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export const POST = route(async (req, ctx) => {
  await requireUser("ADMIN");
  const { kind } = await ctx.params;
  const repo = catalogKind(kind);
  const input = await parseBody(req, schema);
  return json({ item: await repo.create({ ...input, slug: slugify(input.name) }) }, 201);
});

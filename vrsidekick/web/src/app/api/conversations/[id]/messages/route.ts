import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, parseBody, route, searchParams } from "@/lib/http";
import { loadConversationFor, postMessage } from "@/lib/services/conversations";

/** Messages in a thread. Pass ?after=<ISO date> to poll for new ones. */
export const GET = route(async (req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await loadConversationFor(user, id);
  const after = searchParams(req).get("after");
  const messages = await db.message.findMany({
    where: { conversationId: id, ...(after ? { createdAt: { gt: new Date(after) } } : {}) },
    orderBy: { createdAt: "asc" },
    take: 500,
  });
  await db.message.updateMany({
    where: { conversationId: id, senderId: { not: user.id }, readAt: null },
    data: { readAt: new Date() },
  });
  return json({ messages });
});

const schema = z.object({ body: z.string().trim().min(1).max(4000) });

export const POST = route(async (req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await loadConversationFor(user, id);
  const { body } = await parseBody(req, schema);
  return json({ message: await postMessage(id, user.id, body) }, 201);
});

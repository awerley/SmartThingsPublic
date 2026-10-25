import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { badRequest, json, parseBody, route } from "@/lib/http";
import { getOrCreateConversation, postMessage } from "@/lib/services/conversations";

export const GET = route(async () => {
  const user = await requireUser();
  const convos = await db.conversation.findMany({
    where: user.role === "SIDEKICK" ? { sidekick: { userId: user.id } } : { hostId: user.id },
    include: {
      host: { select: { id: true, name: true, avatarUrl: true } },
      sidekick: { select: { id: true, userId: true, displayName: true } },
      wantedAd: { select: { id: true, title: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });
  const unread = await db.message.groupBy({
    by: ["conversationId"],
    where: { conversationId: { in: convos.map((c) => c.id) }, senderId: { not: user.id }, readAt: null },
    _count: true,
  });
  const unreadMap = new Map(unread.map((u) => [u.conversationId, u._count]));
  return json({
    conversations: convos.map(({ messages, ...c }) => ({
      ...c,
      lastMessage: messages[0] ?? null,
      unread: unreadMap.get(c.id) ?? 0,
      otherName: user.role === "SIDEKICK" ? c.host.name : c.sidekick.displayName,
    })),
  });
});

const schema = z.object({ sidekickId: z.string(), message: z.string().min(1).max(4000) });

/** Host starts (or continues) a chat with a sidekick, e.g. to confirm they can support a job. */
export const POST = route(async (req) => {
  const user = await requireUser("HOST");
  const { sidekickId, message } = await parseBody(req, schema);
  const sk = await db.sidekickProfile.findUnique({ where: { id: sidekickId } });
  if (!sk) throw badRequest("Sidekick not found");
  const convo = await getOrCreateConversation(user.id, sidekickId);
  await postMessage(convo.id, user.id, message);
  return json({ conversation: convo }, 201);
});

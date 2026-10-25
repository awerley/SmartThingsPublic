import type { User } from "@prisma/client";
import { db } from "../db";
import { forbidden, notFound } from "../http";

export async function getOrCreateConversation(hostId: string, sidekickId: string, extra?: { wantedAdId?: string; subject?: string }) {
  return db.conversation.upsert({
    where: { hostId_sidekickId: { hostId, sidekickId } },
    update: extra?.wantedAdId ? { wantedAdId: extra.wantedAdId, subject: extra.subject } : {},
    create: { hostId, sidekickId, ...extra },
  });
}

export async function postMessage(conversationId: string, senderId: string, body: string) {
  const [msg] = await db.$transaction([
    db.message.create({ data: { conversationId, senderId, body } }),
    db.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
  ]);
  return msg;
}

/** Posts an automatic note (job requested, accepted, ...) into the host/sidekick thread. */
export async function postJobNote(hostId: string, sidekickId: string, senderId: string, body: string) {
  const convo = await getOrCreateConversation(hostId, sidekickId);
  return postMessage(convo.id, senderId, body);
}

export async function loadConversationFor(user: User, id: string) {
  const convo = await db.conversation.findUnique({
    where: { id },
    include: {
      host: { select: { id: true, name: true, avatarUrl: true } },
      sidekick: { select: { id: true, userId: true, displayName: true, user: { select: { avatarUrl: true } } } },
      wantedAd: { select: { id: true, title: true } },
    },
  });
  if (!convo) throw notFound();
  const isParticipant = convo.hostId === user.id || convo.sidekick.userId === user.id;
  if (!isParticipant && user.role !== "ADMIN") throw forbidden();
  return convo;
}

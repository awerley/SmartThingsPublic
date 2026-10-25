import { z } from "zod";
import { db } from "@/lib/db";
import { requireSidekick } from "@/lib/auth";
import { badRequest, json, notFound, parseBody, route } from "@/lib/http";
import { getOrCreateConversation, postMessage } from "@/lib/services/conversations";

const schema = z.object({ message: z.string().trim().min(1).max(4000) });

/** A sidekick answers a wanted ad, which opens a chat with the host. */
export const POST = route(async (req, ctx) => {
  const { user, profile } = await requireSidekick();
  const { id } = await ctx.params;
  const { message } = await parseBody(req, schema);
  const ad = await db.wantedAd.findUnique({ where: { id } });
  if (!ad) throw notFound();
  if (ad.status !== "OPEN") throw badRequest("This ad is no longer open");
  const convo = await getOrCreateConversation(ad.hostId, profile.id, { wantedAdId: ad.id, subject: ad.title });
  await postMessage(convo.id, user.id, `📣 Re: your ad "${ad.title}"\n\n${message}`);
  return json({ conversation: convo }, 201);
});

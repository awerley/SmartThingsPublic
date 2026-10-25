import { requireUser } from "@/lib/auth";
import { json, route } from "@/lib/http";
import { loadConversationFor } from "@/lib/services/conversations";

export const GET = route(async (_req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  return json({ conversation: await loadConversationFor(user, id) });
});

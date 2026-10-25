import { requireUser } from "@/lib/auth";
import { badRequest, json, route } from "@/lib/http";
import { createCardSetupSession, paymentsEnabled } from "@/lib/stripe";

/** Returns a Stripe Checkout URL where a host saves a card. */
export const POST = route(async () => {
  const user = await requireUser("HOST");
  if (!paymentsEnabled()) throw badRequest("Payments are not configured on this server");
  return json({ url: await createCardSetupSession(user) });
});

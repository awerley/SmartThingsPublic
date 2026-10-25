import { requireSidekick } from "@/lib/auth";
import { badRequest, json, route } from "@/lib/http";
import { createPayoutOnboardingLink, paymentsEnabled } from "@/lib/stripe";

/** Returns a Stripe Connect onboarding URL so a sidekick can get paid. */
export const POST = route(async () => {
  const { user, profile } = await requireSidekick();
  if (!paymentsEnabled()) throw badRequest("Payments are not configured on this server");
  return json({ url: await createPayoutOnboardingLink(user, profile) });
});

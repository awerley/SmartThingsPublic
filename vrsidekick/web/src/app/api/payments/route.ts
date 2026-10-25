import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, route } from "@/lib/http";
import { paymentsEnabled, refreshPayoutStatus } from "@/lib/stripe";

/** Payment setup status for the signed-in user. */
export const GET = route(async () => {
  const user = await requireUser();
  let sidekick = await db.sidekickProfile.findUnique({ where: { userId: user.id } });
  if (sidekick?.stripeAccountId && !sidekick.payoutsEnabled) sidekick = await refreshPayoutStatus(sidekick);
  return json({
    paymentsEnabled: paymentsEnabled(),
    hasPaymentMethod: user.hasPaymentMethod,
    payoutsEnabled: sidekick?.payoutsEnabled ?? false,
    payoutAccountStarted: !!sidekick?.stripeAccountId,
  });
});

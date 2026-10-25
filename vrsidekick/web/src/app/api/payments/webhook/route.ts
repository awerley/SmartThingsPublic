import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

/** Stripe webhook: keeps payment and payout status in sync. */
export async function POST(req: Request) {
  const s = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s || !secret) return new Response("Stripe not configured", { status: 400 });
  let event: Stripe.Event;
  try {
    event = s.webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return new Response("Bad signature", { status: 400 });
  }
  switch (event.type) {
    case "payment_intent.succeeded":
    case "payment_intent.payment_failed": {
      const pi = event.data.object;
      const jobId = pi.metadata?.jobId;
      if (jobId) {
        await db.job.updateMany({
          where: { id: jobId },
          data: {
            paymentStatus: event.type === "payment_intent.succeeded" ? "PAID" : "FAILED",
            stripePaymentIntentId: pi.id,
          },
        });
      }
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (pi) await db.job.updateMany({ where: { stripePaymentIntentId: pi }, data: { paymentStatus: "REFUNDED" } });
      break;
    }
    case "account.updated": {
      const acct = event.data.object;
      await db.sidekickProfile.updateMany({
        where: { stripeAccountId: acct.id },
        data: { payoutsEnabled: !!acct.charges_enabled && !!acct.payouts_enabled },
      });
      break;
    }
    case "setup_intent.succeeded": {
      const si = event.data.object;
      const customer = typeof si.customer === "string" ? si.customer : si.customer?.id;
      if (customer) await db.user.updateMany({ where: { stripeCustomerId: customer }, data: { hasPaymentMethod: true } });
      break;
    }
  }
  return new Response("ok");
}

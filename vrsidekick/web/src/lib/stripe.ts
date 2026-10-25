import Stripe from "stripe";
import type { Job, SidekickProfile, User } from "@prisma/client";
import { db } from "./db";

let client: Stripe | null = null;

/** Returns the Stripe client, or null when STRIPE_SECRET_KEY is not configured (local development). */
export function stripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key);
  return client;
}

export const paymentsEnabled = () => !!process.env.STRIPE_SECRET_KEY;

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

export async function ensureCustomer(s: Stripe, user: User) {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await s.customers.create({ email: user.email, name: user.name, metadata: { userId: user.id } });
  await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

/** Hosted Stripe Checkout page (setup mode) where a host saves a card for future off-session charges. */
export async function createCardSetupSession(user: User) {
  const s = stripe();
  if (!s) throw new Error("Stripe is not configured");
  const customer = await ensureCustomer(s, user);
  const session = await s.checkout.sessions.create({
    mode: "setup",
    customer,
    payment_method_types: ["card"],
    success_url: `${appUrl()}/api/payments/setup/complete?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/account/payments`,
  });
  return session.url!;
}

export async function completeCardSetup(sessionId: string) {
  const s = stripe();
  if (!s) throw new Error("Stripe is not configured");
  const session = await s.checkout.sessions.retrieve(sessionId, { expand: ["setup_intent"] });
  const intent = session.setup_intent as Stripe.SetupIntent | null;
  if (!intent || intent.status !== "succeeded" || typeof session.customer !== "string") return null;
  const pm = typeof intent.payment_method === "string" ? intent.payment_method : intent.payment_method?.id;
  if (pm) {
    await s.customers.update(session.customer, { invoice_settings: { default_payment_method: pm } });
  }
  await db.user.updateMany({ where: { stripeCustomerId: session.customer }, data: { hasPaymentMethod: true } });
  return session.customer;
}

/** Stripe Connect Express onboarding so a sidekick can receive payouts. */
export async function createPayoutOnboardingLink(user: User, profile: SidekickProfile) {
  const s = stripe();
  if (!s) throw new Error("Stripe is not configured");
  let accountId = profile.stripeAccountId;
  if (!accountId) {
    const account = await s.accounts.create({
      type: "express",
      email: user.email,
      business_type: profile.providerType === "COMPANY" ? "company" : "individual",
      capabilities: { transfers: { requested: true } },
      metadata: { sidekickId: profile.id },
    });
    accountId = account.id;
    await db.sidekickProfile.update({ where: { id: profile.id }, data: { stripeAccountId: accountId } });
  }
  const link = await s.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${appUrl()}/account/payments`,
    return_url: `${appUrl()}/api/payments/connect/complete`,
  });
  return link.url;
}

export async function refreshPayoutStatus(profile: SidekickProfile) {
  const s = stripe();
  if (!s || !profile.stripeAccountId) return profile;
  const account = await s.accounts.retrieve(profile.stripeAccountId);
  return db.sidekickProfile.update({
    where: { id: profile.id },
    data: { payoutsEnabled: !!account.charges_enabled && !!account.payouts_enabled },
  });
}

/**
 * Charges the host's saved card for a completed job. The sidekick receives the subtotal via a
 * destination charge; the marketplace keeps the service fee as the application fee.
 */
export async function chargeJob(job: Job & { host: User; sidekick: SidekickProfile }) {
  const s = stripe();
  if (!s) {
    // No Stripe keys: simulate a successful charge in development/demo, otherwise leave it unpaid.
    const simulate = process.env.NODE_ENV !== "production" || process.env.SIMULATE_PAYMENTS === "true";
    if (!simulate) console.error(`Stripe is not configured; job ${job.id} left unpaid`);
    return db.job.update({ where: { id: job.id }, data: { paymentStatus: simulate ? "PAID" : "UNPAID" } });
  }
  if (!job.host.stripeCustomerId) {
    return db.job.update({ where: { id: job.id }, data: { paymentStatus: "FAILED" } });
  }
  const customer = await s.customers.retrieve(job.host.stripeCustomerId);
  const pm =
    !customer.deleted && customer.invoice_settings.default_payment_method
      ? String(
          typeof customer.invoice_settings.default_payment_method === "string"
            ? customer.invoice_settings.default_payment_method
            : customer.invoice_settings.default_payment_method.id,
        )
      : undefined;
  try {
    const intent = await s.paymentIntents.create(
      {
        amount: job.totalCents,
        currency: "usd",
        customer: job.host.stripeCustomerId,
        payment_method: pm,
        off_session: true,
        confirm: true,
        ...(job.sidekick.stripeAccountId
          ? {
              application_fee_amount: job.serviceFeeCents,
              transfer_data: { destination: job.sidekick.stripeAccountId },
            }
          : {}),
        description: `VR Sidekick job: ${job.title}`,
        metadata: { jobId: job.id },
      },
      { idempotencyKey: `job-${job.id}-${job.totalCents}` },
    );
    return db.job.update({
      where: { id: job.id },
      data: {
        stripePaymentIntentId: intent.id,
        paymentStatus: intent.status === "succeeded" ? "PAID" : "PROCESSING",
      },
    });
  } catch (e) {
    console.error("charge failed", e);
    return db.job.update({ where: { id: job.id }, data: { paymentStatus: "FAILED" } });
  }
}

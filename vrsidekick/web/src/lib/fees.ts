import type { RateType } from "@prisma/client";

export type FeeSettings = {
  oneTimeFeePercent: number;
  recurringFeePercent: number;
  minimumFeeCents: number;
};

export type Pricing = {
  subtotalCents: number;
  serviceFeeCents: number;
  totalCents: number;
  feePercentApplied: number;
};

/** Hours billed for an hourly job: actual if known, else the estimate, else the scheduled duration. */
export function billableHours(opts: {
  actualHours?: number | null;
  estimatedHours?: number | null;
  startAt: Date;
  endAt: Date;
}) {
  if (opts.actualHours != null) return opts.actualHours;
  if (opts.estimatedHours != null) return opts.estimatedHours;
  return Math.max(0, (opts.endAt.getTime() - opts.startAt.getTime()) / 3_600_000);
}

/**
 * The host pays the sidekick's price plus a marketplace service fee.
 * The fee percentage differs for one-time vs. recurring work and has a floor.
 */
export function priceJob(
  input: { rateType: RateType; rateCents: number; hours: number; recurring: boolean },
  settings: FeeSettings,
): Pricing {
  const subtotalCents =
    input.rateType === "FLAT" ? input.rateCents : Math.round(input.rateCents * input.hours);
  const pct = input.recurring ? settings.recurringFeePercent : settings.oneTimeFeePercent;
  const pctFee = Math.round((subtotalCents * pct) / 100);
  const serviceFeeCents = subtotalCents === 0 ? 0 : Math.max(settings.minimumFeeCents, pctFee);
  return {
    subtotalCents,
    serviceFeeCents,
    totalCents: subtotalCents + serviceFeeCents,
    feePercentApplied: pct,
  };
}

export const formatMoney = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

import { describe, expect, it } from "vitest";
import { occurrences } from "./recurrence";
import { priceJob } from "./fees";

describe("occurrences", () => {
  it("keeps local time across a DST change", () => {
    const out = occurrences({
      firstStartAt: new Date("2026-10-26T09:00:00-04:00"),
      frequency: "WEEKLY",
      timezone: "America/New_York",
      from: new Date("2026-10-01T00:00:00Z"),
      until: new Date("2026-11-10T00:00:00Z"),
    });
    expect(out.map((x) => x.toISOString())).toEqual([
      "2026-10-26T13:00:00.000Z",
      "2026-11-02T14:00:00.000Z",
      "2026-11-09T14:00:00.000Z",
    ]);
  });
  it("respects the series end date and biweekly frequency", () => {
    const out = occurrences({
      firstStartAt: new Date("2026-01-05T15:00:00Z"),
      frequency: "BIWEEKLY",
      timezone: "UTC",
      from: new Date("2026-01-01T00:00:00Z"),
      until: new Date("2026-12-31T00:00:00Z"),
      endsOn: new Date("2026-02-03T00:00:00Z"),
    });
    expect(out).toHaveLength(3);
  });
});

describe("priceJob", () => {
  const settings = { oneTimeFeePercent: 15, recurringFeePercent: 10, minimumFeeCents: 200 };
  it("charges the one-time fee on hourly work", () => {
    expect(priceJob({ rateType: "HOURLY", rateCents: 4000, hours: 2.5, recurring: false }, settings)).toEqual({
      subtotalCents: 10000,
      serviceFeeCents: 1500,
      totalCents: 11500,
      feePercentApplied: 15,
    });
  });
  it("charges the recurring fee with a minimum", () => {
    const p = priceJob({ rateType: "FLAT", rateCents: 1500, hours: 1, recurring: true }, settings);
    expect(p.serviceFeeCents).toBe(200);
    expect(p.totalCents).toBe(1700);
  });
});

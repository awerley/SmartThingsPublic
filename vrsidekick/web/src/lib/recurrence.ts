import { DateTime } from "luxon";
import type { Frequency } from "@prisma/client";

/** Start times of a recurring series that fall in [from, until), keeping local wall-clock time across DST. */
export function occurrences(opts: {
  firstStartAt: Date;
  frequency: Frequency;
  timezone: string;
  from: Date;
  until: Date;
  endsOn?: Date | null;
}): Date[] {
  const first = DateTime.fromJSDate(opts.firstStartAt, { zone: opts.timezone });
  const step = (n: number) =>
    opts.frequency === "WEEKLY"
      ? first.plus({ weeks: n })
      : opts.frequency === "BIWEEKLY"
        ? first.plus({ weeks: 2 * n })
        : first.plus({ months: n });
  const limit = Math.min(opts.until.getTime(), opts.endsOn ? opts.endsOn.getTime() : Infinity);
  const out: Date[] = [];
  for (let n = 0; n < 1000; n++) {
    const t = step(n);
    if (t.toMillis() >= limit) break;
    if (t.toMillis() >= opts.from.getTime()) out.push(t.toJSDate());
  }
  return out;
}

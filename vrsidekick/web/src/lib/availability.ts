import { DateTime } from "luxon";

export type Interval = { start: number; end: number }; // epoch milliseconds, end exclusive

export type WeeklyRule = { dayOfWeek: number; startMinute: number; endMinute: number };
export type Exception = { kind: "BLOCK" | "EXTRA"; startAt: Date; endAt: Date };
export type Busy = { startAt: Date; endAt: Date };

export function mergeIntervals(list: Interval[]): Interval[] {
  const sorted = list.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const cur of sorted) {
    const last = out[out.length - 1];
    if (last && cur.start <= last.end) last.end = Math.max(last.end, cur.end);
    else out.push({ ...cur });
  }
  return out;
}

export function subtractIntervals(base: Interval[], remove: Interval[]): Interval[] {
  let result = mergeIntervals(base);
  for (const r of mergeIntervals(remove)) {
    const next: Interval[] = [];
    for (const b of result) {
      if (r.end <= b.start || r.start >= b.end) {
        next.push(b);
        continue;
      }
      if (r.start > b.start) next.push({ start: b.start, end: r.start });
      if (r.end < b.end) next.push({ start: r.end, end: b.end });
    }
    result = next;
  }
  return result;
}

/** Expands the standard weekly schedule into concrete intervals within [from, to). */
export function expandWeeklyRules(rules: WeeklyRule[], timezone: string, from: Date, to: Date): Interval[] {
  const out: Interval[] = [];
  let day = DateTime.fromJSDate(from, { zone: timezone }).startOf("day");
  const end = DateTime.fromJSDate(to, { zone: timezone });
  while (day < end) {
    for (const r of rules) {
      if (r.dayOfWeek !== day.weekday) continue;
      out.push({
        start: day.plus({ minutes: r.startMinute }).toMillis(),
        end: day.plus({ minutes: r.endMinute }).toMillis(),
      });
    }
    day = day.plus({ days: 1 });
  }
  return out;
}

/**
 * Open windows = weekly schedule + one-off extra windows
 *              − blocked time − scheduled jobs (padded by the travel buffer).
 */
export function computeOpenWindows(opts: {
  rules: WeeklyRule[];
  exceptions: Exception[];
  busy: Busy[];
  timezone: string;
  from: Date;
  to: Date;
  bufferMins?: number;
}): Interval[] {
  const buffer = (opts.bufferMins ?? 0) * 60_000;
  const toI = (e: { startAt: Date; endAt: Date }, pad = 0): Interval => ({
    start: e.startAt.getTime() - pad,
    end: e.endAt.getTime() + pad,
  });
  const available = [
    ...expandWeeklyRules(opts.rules, opts.timezone, opts.from, opts.to),
    ...opts.exceptions.filter((e) => e.kind === "EXTRA").map((e) => toI(e)),
  ];
  const removed = [
    ...opts.exceptions.filter((e) => e.kind === "BLOCK").map((e) => toI(e)),
    ...opts.busy.map((b) => toI(b, buffer)),
  ];
  const window = { start: opts.from.getTime(), end: opts.to.getTime() };
  return subtractIntervals(available, removed)
    .map((i) => ({ start: Math.max(i.start, window.start), end: Math.min(i.end, window.end) }))
    .filter((i) => i.end > i.start);
}

export function fitsInWindows(windows: Interval[], start: Date, end: Date) {
  return windows.some((w) => w.start <= start.getTime() && w.end >= end.getTime());
}

import { describe, expect, it } from "vitest";
import { computeOpenWindows, fitsInWindows, mergeIntervals, subtractIntervals } from "./availability";

const tz = "America/New_York";
const d = (s: string) => new Date(s);

describe("interval math", () => {
  it("merges overlapping intervals", () => {
    expect(mergeIntervals([{ start: 5, end: 10 }, { start: 0, end: 6 }, { start: 12, end: 13 }])).toEqual([
      { start: 0, end: 10 },
      { start: 12, end: 13 },
    ]);
  });
  it("subtracts holes", () => {
    expect(subtractIntervals([{ start: 0, end: 10 }], [{ start: 3, end: 5 }])).toEqual([
      { start: 0, end: 3 },
      { start: 5, end: 10 },
    ]);
  });
});

describe("computeOpenWindows", () => {
  // Monday 2026-11-02, 9:00-17:00 local = 14:00-22:00 UTC (EST)
  const rules = [{ dayOfWeek: 1, startMinute: 9 * 60, endMinute: 17 * 60 }];
  const from = d("2026-11-02T00:00:00-05:00");
  const to = d("2026-11-03T00:00:00-05:00");

  it("expands the weekly schedule in the sidekick's timezone", () => {
    const w = computeOpenWindows({ rules, exceptions: [], busy: [], timezone: tz, from, to });
    expect(w).toEqual([{ start: d("2026-11-02T14:00:00Z").getTime(), end: d("2026-11-02T22:00:00Z").getTime() }]);
  });

  it("removes scheduled jobs plus travel buffer, and blocked time", () => {
    const w = computeOpenWindows({
      rules,
      exceptions: [{ kind: "BLOCK", startAt: d("2026-11-02T16:00:00-05:00"), endAt: d("2026-11-02T17:00:00-05:00") }],
      busy: [{ startAt: d("2026-11-02T11:00:00-05:00"), endAt: d("2026-11-02T12:00:00-05:00") }],
      timezone: tz,
      from,
      to,
      bufferMins: 30,
    });
    expect(w.map((i) => [new Date(i.start).toISOString(), new Date(i.end).toISOString()])).toEqual([
      ["2026-11-02T14:00:00.000Z", "2026-11-02T15:30:00.000Z"],
      ["2026-11-02T17:30:00.000Z", "2026-11-02T21:00:00.000Z"],
    ]);
  });

  it("adds one-off extra availability outside the normal schedule", () => {
    const w = computeOpenWindows({
      rules,
      exceptions: [{ kind: "EXTRA", startAt: d("2026-11-02T18:00:00-05:00"), endAt: d("2026-11-02T20:00:00-05:00") }],
      busy: [],
      timezone: tz,
      from,
      to,
    });
    expect(w).toHaveLength(2);
    expect(fitsInWindows(w, d("2026-11-02T18:30:00-05:00"), d("2026-11-02T19:30:00-05:00"))).toBe(true);
    expect(fitsInWindows(w, d("2026-11-02T17:30:00-05:00"), d("2026-11-02T18:30:00-05:00"))).toBe(false);
  });
});

/**
 * Unit cover for the duration helpers. Pure functions, no DOM:
 *
 *   npm run test
 *
 * Parsing is the part worth pinning down — it turns whatever a person types
 * into minutes that get logged against their work.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  HOUR,
  MINUTE,
  SECOND,
  entryDurationMs,
  formatDuration,
  formatStopwatch,
  parseDuration,
  runningEntry,
  totalDurationMs,
} from "./time.ts";
import type { TimeEntry } from "./types.ts";

function entry(startedAt: string, endedAt: string | null): TimeEntry {
  return {
    id: "e1",
    taskId: "t1",
    startedAt,
    endedAt,
    source: "timer",
    createdAt: startedAt,
  };
}

test("parseDuration reads the forms people actually type", () => {
  assert.equal(parseDuration("90"), 90 * MINUTE, "a bare number is minutes");
  assert.equal(parseDuration("1.5h"), 90 * MINUTE);
  assert.equal(parseDuration("2h 30m"), 2 * HOUR + 30 * MINUTE);
  assert.equal(parseDuration("2h30m"), 2 * HOUR + 30 * MINUTE);
  assert.equal(parseDuration("2 hours 30 minutes"), 2 * HOUR + 30 * MINUTE);
  assert.equal(parseDuration("2hrs"), 2 * HOUR);
  assert.equal(parseDuration("45s"), 45 * SECOND);
  assert.equal(parseDuration("2:30"), 2 * HOUR + 30 * MINUTE, "h:mm");
  assert.equal(parseDuration("0:45"), 45 * MINUTE);
  assert.equal(parseDuration("  3h  "), 3 * HOUR, "surrounding space is fine");
});

test("parseDuration rejects what it cannot fully understand", () => {
  assert.equal(parseDuration(""), null);
  assert.equal(parseDuration("   "), null);
  assert.equal(parseDuration("soon"), null);
  assert.equal(parseDuration("2h banana"), null, "no partial credit");
  assert.equal(parseDuration("-30m"), null);
  assert.equal(parseDuration("0"), null, "zero is not a duration");
  assert.equal(parseDuration("0m"), null);
  assert.equal(parseDuration("2:75"), null, "75 is not a minute count");
});

test("formatDuration is compact and never rounds up", () => {
  assert.equal(formatDuration(0), "0m");
  assert.equal(formatDuration(-5), "0m");
  assert.equal(formatDuration(30 * SECOND), "<1m");
  assert.equal(formatDuration(45 * MINUTE), "45m");
  assert.equal(formatDuration(3 * HOUR), "3h");
  assert.equal(formatDuration(2 * HOUR + 15 * MINUTE), "2h 15m");
  assert.equal(
    formatDuration(HOUR + 59 * MINUTE + 59 * SECOND),
    "1h 59m",
    "59m59s stays at 59m rather than carrying to 2h",
  );
});

test("formatStopwatch pads to H:MM:SS", () => {
  assert.equal(formatStopwatch(0), "0:00:00");
  assert.equal(formatStopwatch(61 * SECOND), "0:01:01");
  assert.equal(formatStopwatch(2 * HOUR + 5 * MINUTE + 9 * SECOND), "2:05:09");
});

test("an open entry is measured against now", () => {
  const now = Date.parse("2026-01-01T12:00:00.000Z");
  const open = entry("2026-01-01T11:30:00.000Z", null);
  assert.equal(entryDurationMs(open, now), 30 * MINUTE);
  assert.equal(runningEntry([open])?.id, "e1");
});

test("a closed entry ignores now", () => {
  const now = Date.parse("2026-01-01T23:00:00.000Z");
  const closed = entry("2026-01-01T09:00:00.000Z", "2026-01-01T10:15:00.000Z");
  assert.equal(entryDurationMs(closed, now), HOUR + 15 * MINUTE);
  assert.equal(runningEntry([closed]), undefined);
});

test("the total sums closed entries and the running one", () => {
  const now = Date.parse("2026-01-01T12:00:00.000Z");
  const entries: TimeEntry[] = [
    { ...entry("2026-01-01T09:00:00.000Z", "2026-01-01T10:00:00.000Z"), id: "a" },
    { ...entry("2026-01-01T10:30:00.000Z", "2026-01-01T11:00:00.000Z"), id: "b" },
    { ...entry("2026-01-01T11:45:00.000Z", null), id: "c" },
  ];
  assert.equal(totalDurationMs(entries, now), HOUR + 30 * MINUTE + 15 * MINUTE);
  assert.equal(totalDurationMs([], now), 0);
  assert.equal(totalDurationMs(undefined, now), 0);
});

test("garbage timestamps count as zero rather than NaN", () => {
  assert.equal(entryDurationMs(entry("not-a-date", null)), 0);
  assert.equal(entryDurationMs(entry("2026-01-01T09:00:00.000Z", "nope")), 0);
});

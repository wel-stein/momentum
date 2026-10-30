/**
 * Duration helpers for task time tracking.
 *
 * A task's time is stored as a list of intervals (`TimeEntry`), not as a
 * single number: the stopwatch can be started and stopped many times, and
 * the task still reports one total. Keeping the total derived means it can
 * never drift from the log that explains it.
 *
 * Everything here is pure, so the parsing rules can be tested without a
 * browser — see time.test.ts.
 */

import type { TimeEntry } from "./types";

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;

/** The open entry, if a stopwatch is currently running on this task. */
export function runningEntry(
  entries: TimeEntry[] | undefined,
): TimeEntry | undefined {
  return entries?.find((e) => !e.endedAt);
}

/** Elapsed ms for one entry. An open entry is measured against `now`. */
export function entryDurationMs(entry: TimeEntry, now = Date.now()): number {
  const start = Date.parse(entry.startedAt);
  if (Number.isNaN(start)) return 0;
  const end = entry.endedAt ? Date.parse(entry.endedAt) : now;
  if (Number.isNaN(end)) return 0;
  return Math.max(0, end - start);
}

/** Total across every entry — the task's single duration. */
export function totalDurationMs(
  entries: TimeEntry[] | undefined,
  now = Date.now(),
): number {
  if (!entries || entries.length === 0) return 0;
  return entries.reduce((sum, e) => sum + entryDurationMs(e, now), 0);
}

/**
 * Compact total for board cells and summaries: "2h 15m", "45m", "3h".
 * Minutes are floored rather than rounded so the number never reads ahead
 * of the stopwatch it came from.
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0m";
  if (ms < MINUTE) return "<1m";
  const hours = Math.floor(ms / HOUR);
  const minutes = Math.floor((ms % HOUR) / MINUTE);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/** Live stopwatch reading, H:MM:SS — used while a timer is running. */
export function formatStopwatch(ms: number): string {
  const total = Math.max(0, Math.floor(ms / SECOND));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// A number with an optional unit: 90, 1.5h, 30 min, 45 secs.
const PAIR = String.raw`\d+(?:\.\d+)?\s*(?:h(?:ours?|rs?)?|m(?:in(?:ute)?s?)?|s(?:ec(?:ond)?s?)?)`;
const PAIR_ONLY = new RegExp(`^(?:${PAIR}\\s*)+$`);
const PAIR_SCAN = new RegExp(PAIR, "g");
const UNIT_MS: Record<string, number> = { h: HOUR, m: MINUTE, s: SECOND };

/**
 * Parse a typed duration into milliseconds, or null if it doesn't make sense.
 *
 * Accepts "2h 30m", "2h30m", "1.5h", "90m", "45s", the clock form "2:30",
 * and a bare "90" — minutes, which is the unit people mean when they type a
 * plain number into a duration box.
 *
 * Input that only partly parses ("2h banana") is rejected outright rather
 * than silently logging the part that matched.
 */
export function parseDuration(input: string): number | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;

  // "2:30" / "0:45" — h:mm.
  const clock = /^(\d+):([0-5]\d)$/.exec(text);
  if (clock) {
    const ms = Number(clock[1]) * HOUR + Number(clock[2]) * MINUTE;
    return ms > 0 ? ms : null;
  }

  // A bare number is minutes.
  if (/^\d+(?:\.\d+)?$/.test(text)) {
    const ms = Math.round(Number(text) * MINUTE);
    return ms > 0 ? ms : null;
  }

  if (!PAIR_ONLY.test(text)) return null;
  let ms = 0;
  for (const match of text.match(PAIR_SCAN) ?? []) {
    const value = Number(/^\d+(?:\.\d+)?/.exec(match)?.[0] ?? "0");
    const unit = /[hms]/.exec(match.replace(/^\d+(?:\.\d+)?\s*/, ""))?.[0];
    if (!unit) return null;
    ms += value * UNIT_MS[unit];
  }
  return ms > 0 ? Math.round(ms) : null;
}

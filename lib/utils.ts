import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AVATAR_COLORS } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function pickAvatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/**
 * Stable mono ID for a task — e.g. MOM-A4F2. Derived from the random nanoid
 * so the display string never changes for a given task.
 */
export function taskCode(id: string) {
  return `MOM-${id.slice(0, 4).toUpperCase()}`;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Smart date chip in the Linear style.
 *   Today → "Today"
 *   Tomorrow / Yesterday → that word
 *   Within ±6 days → weekday name ("Thu")
 *   Within this year → "Aug 14"
 *   Otherwise → "Aug 14, 2026"
 */
export function formatDateSmart(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / MS_PER_DAY,
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays <= 6)
    return target.toLocaleDateString(undefined, { weekday: "short" });
  if (diffDays < -1 && diffDays >= -6)
    return target.toLocaleDateString(undefined, { weekday: "short" });
  if (target.getFullYear() === today.getFullYear())
    return target.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  return target.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Convert an ISO date string to a YYYY-MM-DD in the user's local time zone.
 * Pairs with localDateInputToIso so dates round-trip without slipping a day
 * across time zones (the classic `new Date("2024-05-16").toISOString()`
 * UTC-midnight gotcha).
 */
export function isoToLocalDateInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Convert a YYYY-MM-DD string (from a date input or calendar picker) to an
 * ISO timestamp anchored at local noon — keeps the calendar date stable
 * regardless of the user's time zone.
 */
export function localDateInputToIso(value: string): string | undefined {
  if (!value) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return undefined;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), 12, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export function formatDateLong(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isOverdue(iso?: string) {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const today = startOfDay(new Date());
  return startOfDay(d).getTime() < today.getTime();
}

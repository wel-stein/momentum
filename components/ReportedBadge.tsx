"use client";

import { Send } from "lucide-react";
import { cn, formatDateSmart } from "@/lib/utils";

/**
 * Marks a task management has already seen in a weekly report.
 *
 * The point is housekeeping: once the report has gone out, a finished task
 * has served its purpose on the board, and this is the signal that it is
 * safe to clear. Renders nothing for a task that has never been reported,
 * so an unreported board stays visually quiet.
 */
export function ReportedBadge({
  reportedAt,
  className,
}: {
  reportedAt?: string | null;
  className?: string;
}) {
  if (!reportedAt) return null;
  const when = formatDateSmart(reportedAt);
  const label = `Reported to management ${when}`;
  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-400",
        className,
      )}
    >
      <Send className="h-2.5 w-2.5 shrink-0" />
      <span className="whitespace-nowrap">Reported</span>
    </span>
  );
}

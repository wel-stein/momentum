"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  cn,
  formatDateSmart,
  isoToLocalDateInput,
  localDateInputToIso,
} from "@/lib/utils";
import { Popover } from "./Popover";

interface Props {
  /** ISO date string. */
  value: string | null | undefined;
  /** Called with a new ISO string, or undefined when cleared. */
  onChange: (next: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  /** "trigger" overrides the default chip-style trigger. */
  size?: "sm" | "md";
  className?: string;
  /** Show "Today" / "Yesterday" / weekday smart format on the trigger. */
  smart?: boolean;
  /** Tint the trigger red when the value is in the past (used for Due dates). */
  overdue?: boolean;
  /** Tooltip / aria label. */
  label?: string;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function DatePicker({
  value,
  onChange,
  placeholder = "—",
  disabled,
  size = "sm",
  className,
  smart = true,
  overdue,
  label,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const valueDate = useMemo(() => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [value]);
  const [cursor, setCursor] = useState(() =>
    startOfMonth(valueDate ?? new Date()),
  );

  useEffect(() => {
    if (open) setCursor(startOfMonth(valueDate ?? new Date()));
  }, [open, valueDate]);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // Build 6×7 grid of dates starting from the Monday on/before the 1st.
  const grid = useMemo(() => {
    const first = cursor;
    const offset = (first.getDay() + 6) % 7; // Mon-first
    const start = new Date(
      first.getFullYear(),
      first.getMonth(),
      1 - offset,
    );
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + i,
      );
      return d;
    });
  }, [cursor]);

  const triggerText = value
    ? smart
      ? formatDateSmart(value)
      : isoToLocalDateInput(value)
    : placeholder;

  const select = (d: Date) => {
    onChange(localDateInputToIso(isoToLocalDateInput(d.toISOString())));
    setOpen(false);
  };
  const clear = () => {
    onChange(undefined);
    setOpen(false);
  };

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          if (disabled) return;
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title={label}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1 rounded border bg-transparent tabular-nums transition-colors",
          size === "sm"
            ? "px-1.5 py-0.5 text-[11px]"
            : "px-2 py-1 text-[12px]",
          value
            ? overdue
              ? "border-transparent text-rose-500 hover:border-rose-500/30"
              : "border-transparent text-fg-muted hover:border-line hover:bg-hover"
            : "border-dashed border-line text-fg-faint hover:border-line-strong hover:text-fg-subtle",
          disabled && "cursor-default hover:border-transparent hover:bg-transparent",
        )}
      >
        <CalendarIcon className="h-3 w-3 opacity-70" />
        <span className="whitespace-nowrap">{triggerText}</span>
      </button>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={ref}
        className="w-[252px] rounded-md border border-line bg-elevated shadow-xl shadow-black/40"
      >
        <div className="flex items-center justify-between border-b border-line px-2 py-1.5">
          <button
            type="button"
            onClick={() => setCursor((c) => addMonths(c, -1))}
            className="rounded p-1 text-fg-subtle hover:bg-hover hover:text-fg"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <div className="text-[12px] font-medium tracking-tight text-fg">
            {cursor.toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </div>
          <button
            type="button"
            onClick={() => setCursor((c) => addMonths(c, 1))}
            className="rounded p-1 text-fg-subtle hover:bg-hover hover:text-fg"
            aria-label="Next month"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-px px-2 pt-2 text-center text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
          {WEEKDAYS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px p-1.5">
          {grid.map((d) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = sameDay(d, today);
            const isSelected = valueDate && sameDay(d, valueDate);
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => select(d)}
                className={cn(
                  "h-7 rounded text-[12px] tabular-nums transition-colors",
                  isSelected
                    ? "bg-brand-500 font-medium text-white hover:bg-brand-400"
                    : inMonth
                    ? "text-fg hover:bg-hover"
                    : "text-fg-faint hover:bg-hover",
                  !isSelected && isToday && "ring-1 ring-brand-500/40",
                )}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t border-line px-2 py-1.5">
          <button
            type="button"
            onClick={() => select(today)}
            className="rounded px-2 py-0.5 text-[11px] font-medium text-fg-subtle hover:bg-hover hover:text-fg"
          >
            Today
          </button>
          {value && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-fg-subtle hover:bg-rose-500/10 hover:text-rose-500"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      </Popover>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { PRIORITY_META, Priority } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  value: Priority;
  onChange: (next: Priority) => void;
  size?: "sm" | "md";
  disabled?: boolean;
}

const ORDER: Priority[] = ["low", "medium", "high", "critical"];

// Three vertical bars, lit from left to right based on priority.
// Critical replaces bars with an alert icon.
function PriorityGlyph({
  value,
  className,
}: {
  value: Priority;
  className?: string;
}) {
  if (value === "critical") {
    return (
      <AlertTriangle
        className={cn("h-3 w-3 text-rose-400", className)}
        strokeWidth={2.5}
      />
    );
  }
  const lit = value === "high" ? 3 : value === "medium" ? 2 : 1;
  const tone =
    value === "high"
      ? "bg-orange-400"
      : value === "medium"
      ? "bg-zinc-300"
      : "bg-zinc-500";
  return (
    <span className={cn("inline-flex items-end gap-[2px]", className)}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-[1px]",
            i === 1 ? "h-1.5" : i === 2 ? "h-[7px]" : "h-2.5",
            i <= lit ? tone : "bg-white/10",
          )}
        />
      ))}
    </span>
  );
}

export function PriorityIndicator({
  value,
  className,
}: {
  value: Priority;
  className?: string;
}) {
  return (
    <span
      title={`${PRIORITY_META[value].label} priority`}
      className={cn("inline-flex items-center", className)}
    >
      <PriorityGlyph value={value} />
    </span>
  );
}

// Interactive picker used in table rows and the detail modal.
export function PriorityPill({ value, onChange, size = "sm", disabled }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          if (disabled) return;
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/[0.04] text-zinc-300 transition-colors",
          size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs",
          !disabled && "hover:border-white/20 hover:bg-white/[0.08]",
        )}
      >
        <PriorityGlyph value={value} />
        <span>{PRIORITY_META[value].label}</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-36 overflow-hidden rounded-md border border-white/10 bg-ink-800 shadow-xl shadow-black/40">
          {ORDER.map((p) => (
            <button
              key={p}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(p);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs text-zinc-200 hover:bg-white/[0.06]"
            >
              <PriorityGlyph value={p} />
              <span className="flex-1">{PRIORITY_META[p].label}</span>
              {p === value && <Check className="h-3 w-3 text-zinc-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { STATUSES, StatusKey } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  value: StatusKey;
  onChange: (next: StatusKey) => void;
  size?: "sm" | "md";
  disabled?: boolean;
}

// Status color is carried by a small dot inside a neutral pill,
// per the Linear-dense aesthetic.
const DOT: Record<StatusKey, string> = {
  not_started: "bg-zinc-500",
  in_progress: "bg-amber-400",
  stuck: "bg-rose-500",
  kiv: "bg-sky-400",
  review: "bg-violet-400",
  done: "bg-emerald-500",
};

export function StatusPill({ value, onChange, size = "sm", disabled }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = STATUSES.find((s) => s.key === value) ?? STATUSES[0];

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
          "inline-flex items-center gap-1.5 rounded border border-line bg-hover text-fg whitespace-nowrap transition-colors",
          size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs",
          !disabled && "hover:border-line-strong hover:bg-hover",
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", DOT[value])} />
        {current.label}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-md border border-line bg-elevated shadow-xl shadow-black/40">
          {STATUSES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(s.key);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs text-fg hover:bg-hover"
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", DOT[s.key])} />
              <span className="flex-1">{s.label}</span>
              {s.key === value && (
                <Check className="h-3 w-3 text-fg-muted" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

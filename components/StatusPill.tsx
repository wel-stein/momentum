"use client";

import { useState, useRef, useEffect } from "react";
import { STATUSES, StatusKey } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  value: StatusKey;
  onChange: (next: StatusKey) => void;
  size?: "sm" | "md";
  disabled?: boolean;
}

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
        style={{ backgroundColor: current.color }}
        className={cn(
          "rounded-md font-semibold text-white whitespace-nowrap shadow-sm",
          size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
          disabled && "cursor-default",
        )}
      >
        {current.label}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-md border bg-white shadow-lg">
          {STATUSES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(s.key);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-slate-50"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

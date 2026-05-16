"use client";

import { useState, useRef, useEffect } from "react";
import { PRIORITY_META, Priority } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  value: Priority;
  onChange: (next: Priority) => void;
  size?: "sm" | "md";
  disabled?: boolean;
}

const ORDER: Priority[] = ["low", "medium", "high", "critical"];

export function PriorityPill({ value, onChange, size = "sm", disabled }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const meta = PRIORITY_META[value];

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
          "inline-flex items-center gap-1 rounded-md font-medium whitespace-nowrap border",
          size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
          disabled && "cursor-default",
        )}
        style={{ color: meta.color, borderColor: meta.color + "55" }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: meta.color }}
        />
        {meta.label}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-32 overflow-hidden rounded-md border bg-white shadow-lg">
          {ORDER.map((p) => (
            <button
              key={p}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(p);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-slate-50"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: PRIORITY_META[p].color }}
              />
              {PRIORITY_META[p].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

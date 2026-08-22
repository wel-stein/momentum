"use client";

import { useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import type { Member } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarStack } from "./Avatar";
import { Popover } from "./Popover";

interface Props {
  members: Member[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

export function AssigneePicker({
  members,
  selected,
  onChange,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const chosen = members.filter((m) => selected.includes(m.id));

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else onChange([...selected, id]);
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          if (disabled) return;
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          "inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors",
          !disabled && "hover:bg-hover",
        )}
      >
        {chosen.length > 0 ? (
          <AvatarStack members={chosen} max={3} size="xs" />
        ) : disabled ? (
          <span className="px-1 text-[11px] text-fg-faint">—</span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded border border-dashed border-line-strong px-1.5 py-0.5 text-[11px] text-fg-subtle hover:border-line-strong hover:text-fg">
            <Plus className="h-3 w-3" /> Assign
          </span>
        )}
      </button>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={ref}
        className="w-56 rounded-md border border-line bg-elevated shadow-xl shadow-black/40"
      >
        <div className="max-h-60 overflow-y-auto py-1">
          {members.length === 0 && (
            <div className="px-3 py-2 text-[11px] text-fg-subtle">
              No members yet. Invite someone first.
            </div>
          )}
          {members.map((m) => {
            const isOn = selected.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(m.id);
                }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs text-fg hover:bg-hover"
              >
                <Avatar member={m} size="sm" />
                <span className="flex-1 truncate">{m.name}</span>
                {isOn && <Check className="h-3.5 w-3.5 text-brand-400" />}
              </button>
            );
          })}
        </div>
      </Popover>
    </div>
  );
}

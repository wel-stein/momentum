"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle({
  variant = "segmented",
  className,
}: {
  variant?: "segmented" | "compact";
  className?: string;
}) {
  const { theme, setTheme, toggle, resolved } = useTheme();

  if (variant === "compact") {
    const Icon = resolved === "dark" ? Sun : Moon;
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={`Switch to ${resolved === "dark" ? "light" : "dark"} mode`}
        title={`Switch to ${resolved === "dark" ? "light" : "dark"} mode`}
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded border border-line bg-surface text-fg-muted hover:bg-hover hover:text-fg",
          className,
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn(
        "inline-flex rounded border border-line bg-surface p-0.5",
        className,
      )}
    >
      {OPTIONS.map((o) => {
        const Icon = o.icon;
        const active = theme === o.value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(o.value)}
            title={o.label}
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded transition-colors",
              active
                ? "bg-hover text-fg"
                : "text-fg-subtle hover:bg-hover hover:text-fg",
            )}
          >
            <Icon className="h-3 w-3" />
          </button>
        );
      })}
    </div>
  );
}

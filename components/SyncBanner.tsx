"use client";

import { AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";

export function SyncBanner() {
  const error = useStore((s) => s.syncError);
  if (!error) return null;
  return (
    <div className="border-b border-amber-500/20 bg-amber-500/[0.07] px-4 py-1.5 text-[11px] text-amber-200">
      <div className="mx-auto flex max-w-7xl items-start gap-2">
        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
        <div className="leading-tight">
          <span className="font-medium">Supabase sync issue:</span> {error}{" "}
          <span className="text-amber-200/70">
            If a column or table is missing, you have an unapplied migration.
            Run{" "}
            <code className="rounded bg-amber-500/10 px-1 py-0.5 font-mono text-[10px]">
              npm run migrate
            </code>{" "}
            to apply everything in{" "}
            <code className="rounded bg-amber-500/10 px-1 py-0.5 font-mono text-[10px]">
              supabase/migrations/
            </code>
            , then reload.
          </span>
        </div>
      </div>
    </div>
  );
}

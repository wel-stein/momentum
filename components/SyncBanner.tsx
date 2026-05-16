"use client";

import { AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";

export function SyncBanner() {
  const error = useStore((s) => s.syncError);
  if (!error) return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
      <div className="mx-auto flex max-w-7xl items-start gap-2">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div>
          <span className="font-medium">Supabase sync issue:</span> {error}{" "}
          <span className="text-amber-700">
            Open the Supabase SQL Editor and run{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5">
              supabase/migrations/0001_initial.sql
            </code>
            , then reload.
          </span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Check, X, Download } from "lucide-react";
import { useKpiStore } from "@/lib/kpi-store";
import { KpiTable } from "./KpiTable";
import { SyncBanner } from "@/components/SyncBanner";
import { UserMenu } from "@/components/UserMenu";
import { cn } from "@/lib/utils";

interface Props {
  year: number;
}

export function KpiYearShell({ year }: Props) {
  const sets = useKpiStore((s) => s.sets);
  const createSet = useKpiStore((s) => s.createSet);
  const renameSet = useKpiStore((s) => s.renameSet);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const kpiSet = sets.find((s) => s.year === year);

  useEffect(() => {
    if (!kpiSet) createSet(year);
  }, [year, kpiSet, createSet]);

  if (!kpiSet) {
    return (
      <div className="flex h-screen items-center justify-center text-fg-faint text-sm">
        Loading…
      </div>
    );
  }

  const totalWeight = kpiSet.items.reduce((sum, i) => sum + i.weightage, 0);

  function startEdit() {
    setTitleDraft(kpiSet!.title);
    setEditingTitle(true);
  }

  function saveTitle() {
    if (titleDraft.trim()) renameSet(kpiSet!.id, titleDraft.trim());
    setEditingTitle(false);
  }

  function handleExport() {
    const data = JSON.stringify(kpiSet, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kpi-${year}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen">
      <SyncBanner />
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/kpi"
              className="flex items-center gap-1.5 text-[12px] text-fg-subtle hover:text-fg"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              KPI sets
            </Link>
            <span className="text-fg-faint">/</span>
            {editingTitle ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveTitle();
                    if (e.key === "Escape") setEditingTitle(false);
                  }}
                  className="rounded border border-brand-500/40 bg-surface px-2 py-0.5 text-[13px] text-fg focus:outline-none"
                />
                <button
                  onClick={saveTitle}
                  className="rounded p-1 text-emerald-500 hover:bg-hover"
                >
                  <Check className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setEditingTitle(false)}
                  className="rounded p-1 text-fg-faint hover:bg-hover"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={startEdit}
                className="group flex items-center gap-1.5 text-[13px] font-medium text-fg hover:text-fg"
              >
                {kpiSet.title}
                <Pencil className="h-3 w-3 text-fg-faint opacity-0 group-hover:opacity-100" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "rounded px-2 py-0.5 text-[11px] font-medium tabular-nums",
                totalWeight === 100
                  ? "bg-emerald-500/10 text-emerald-600"
                  : totalWeight > 100
                    ? "bg-rose-500/10 text-rose-600"
                    : "bg-amber-500/10 text-amber-600",
              )}
            >
              {totalWeight}% / 100%
            </div>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded border border-line px-2.5 py-1 text-[12px] text-fg-subtle hover:border-line-strong hover:text-fg"
              title="Export as JSON"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-medium tracking-tight text-fg">
            Work Performance KPI — {year}
          </h1>
          <p className="mt-0.5 text-[12px] text-fg-subtle">
            {kpiSet.items.length} objective{kpiSet.items.length !== 1 ? "s" : ""}{" "}
            · Drag rows to reorder · Level 3 is the baseline target
          </p>
        </div>

        <KpiTable setId={kpiSet.id} items={kpiSet.items} />
      </main>
    </div>
  );
}

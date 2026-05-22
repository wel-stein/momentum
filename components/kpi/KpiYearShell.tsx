"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Check, X, Download } from "lucide-react";
import { useKpiStore } from "@/lib/kpi-store";
import { KpiTable } from "./KpiTable";
import { SyncBanner } from "@/components/SyncBanner";
import { UserMenu } from "@/components/UserMenu";
import {
  kpiSetAchievedScore,
  kpiAssessedCount,
} from "@/lib/kpi-types";
import { cn } from "@/lib/utils";

interface Props {
  year: number;
}

export function KpiYearShell({ year }: Props) {
  const sets = useKpiStore((s) => s.sets);
  const createSet = useKpiStore((s) => s.createSet);
  const renameSet = useKpiStore((s) => s.renameSet);
  const setHydrated = useKpiStore((s) => s.setHydrated);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    void setHydrated();
  }, [setHydrated]);

  const kpiSet = sets.find((s) => s.year === year);

  useEffect(() => {
    if (!kpiSet) createSet(year);
  }, [year, kpiSet, createSet]);

  useEffect(() => {
    if (kpiSet) return;
    const t = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(t);
  }, [kpiSet]);

  if (!kpiSet) {
    if (timedOut) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-3 text-center">
          <p className="text-[14px] font-medium text-fg">Could not load KPI set.</p>
          <Link href="/kpi" className="text-[12px] text-brand-500 hover:underline">
            ← Back to KPI sets
          </Link>
        </div>
      );
    }
    return (
      <div className="flex h-screen items-center justify-center text-fg-faint text-sm">
        Loading…
      </div>
    );
  }

  const totalWeight = kpiSet.items.reduce((s, i) => s + i.weightage, 0);
  const achieved = kpiSetAchievedScore(kpiSet.items);
  const maxPossible = totalWeight; // selecting level 5 on all = full weightage
  const achievedPct = maxPossible > 0 ? (achieved / maxPossible) * 100 : 0;
  const { assessed, total } = kpiAssessedCount(kpiSet.items);

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
                className="group flex items-center gap-1.5 text-[13px] font-medium text-fg"
              >
                {kpiSet.title}
                <Pencil className="h-3 w-3 text-fg-faint opacity-0 group-hover:opacity-100" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Achieved score */}
            <div
              className={cn(
                "rounded px-2 py-0.5 text-[11px] font-medium tabular-nums",
                achievedPct >= 80
                  ? "bg-emerald-500/10 text-emerald-600"
                  : achievedPct >= 60
                    ? "bg-brand-500/10 text-brand-500"
                    : achievedPct >= 40
                      ? "bg-amber-500/10 text-amber-600"
                      : achievedPct > 0
                        ? "bg-rose-500/10 text-rose-600"
                        : "bg-hover text-fg-faint",
              )}
            >
              {achieved.toFixed(1)}% / 100%
            </div>
            {/* Weightage balance indicator */}
            {totalWeight !== 100 && (
              <div
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] tabular-nums",
                  totalWeight > 100
                    ? "bg-rose-500/10 text-rose-500"
                    : "bg-amber-500/10 text-amber-600",
                )}
                title="Total weightage should equal 100%"
              >
                W: {totalWeight}%
              </div>
            )}

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
        <div className="mb-5">
          <h1 className="text-xl font-medium tracking-tight text-fg">
            Work Performance KPI — {year}
          </h1>
          <p className="mt-0.5 text-[12px] text-fg-subtle">
            {kpiSet.items.length} objective
            {kpiSet.items.length !== 1 ? "s" : ""} · Drag rows to reorder ·
            Level 3 is the baseline target
          </p>
        </div>

        {/* Score summary card */}
        {total > 0 && (
          <div className="mb-6 rounded-lg border border-line bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
                KPI Score Summary
              </div>
              <div className="text-[11px] text-fg-faint">
                {assessed}/{total} assessed
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Overall achieved score */}
              <div>
                <div className="mb-1 text-[10px] text-fg-faint">
                  Achieved score
                </div>
                <div className="text-2xl font-bold tabular-nums tracking-tight text-fg">
                  {achieved.toFixed(1)}
                  <span className="text-sm font-normal text-fg-subtle">
                    /{maxPossible.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-hover">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      achievedPct >= 80
                        ? "bg-emerald-500"
                        : achievedPct >= 60
                          ? "bg-brand-500"
                          : achievedPct >= 40
                            ? "bg-amber-500"
                            : "bg-rose-500",
                    )}
                    style={{ width: `${achievedPct}%` }}
                  />
                </div>
                <div className="mt-1 text-[10px] tabular-nums text-fg-faint">
                  {achievedPct.toFixed(1)}% of max
                </div>
              </div>

              {/* Per-objective breakdown */}
              <div className="col-span-2">
                <div className="mb-1 text-[10px] text-fg-faint">
                  By objective
                </div>
                <div className="space-y-1.5">
                  {kpiSet.items.map((item) => {
                    const itemScore = kpiSetAchievedScore([item]);
                    const itemMax = item.weightage;
                    const pct =
                      itemMax > 0 ? (itemScore / itemMax) * 100 : 0;
                    return (
                      <div key={item.id} className="flex items-center gap-2">
                        <div className="w-4 text-right text-[10px] font-semibold tabular-nums text-fg-faint">
                          {item.no}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="h-1.5 overflow-hidden rounded-full bg-hover">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                pct >= 80
                                  ? "bg-emerald-500"
                                  : pct >= 60
                                    ? "bg-brand-500"
                                    : pct >= 40
                                      ? "bg-amber-500"
                                      : pct > 0
                                        ? "bg-rose-500"
                                        : "bg-transparent",
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-20 text-right tabular-nums text-[10px] text-fg-subtle">
                          {itemScore.toFixed(1)}/{itemMax}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <KpiTable setId={kpiSet.id} items={kpiSet.items} />
      </main>
    </div>
  );
}

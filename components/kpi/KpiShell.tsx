"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Trash2, Target, ChevronRight, BadgeCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useKpiStore } from "@/lib/kpi-store";
import { kpiSetAchievedScore, kpiAssessedCount } from "@/lib/kpi-types";
import { useConfirm } from "@/components/ConfirmDialog";
import { SyncBanner } from "@/components/SyncBanner";
import { UserMenu } from "@/components/UserMenu";
import { Modal } from "@/components/Modal";
import { cn } from "@/lib/utils";

const CURRENT_YEAR = new Date().getFullYear();

export function KpiShell() {
  const sets = useKpiStore((s) => s.sets);
  const createSet = useKpiStore((s) => s.createSet);
  const deleteSet = useKpiStore((s) => s.deleteSet);
  const setHydrated = useKpiStore((s) => s.setHydrated);
  const confirm = useConfirm();
  const router = useRouter();

  useEffect(() => {
    void setHydrated();
  }, [setHydrated]);

  const [showNew, setShowNew] = useState(false);
  const [yearInput, setYearInput] = useState(String(CURRENT_YEAR));

  const sortedSets = [...sets].sort((a, b) => b.year - a.year);

  function handleCreate() {
    const year = parseInt(yearInput, 10);
    if (isNaN(year) || year < 2000 || year > 2100) return;
    const id = createSet(year);
    setShowNew(false);
    router.push(`/kpi/${year}`);
  }

  return (
    <div className="min-h-screen">
      <SyncBanner />
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-6 w-6 place-items-center rounded bg-brand-500 text-white">
              <span className="text-[11px] font-bold tracking-tight">M</span>
            </div>
            <Link
              href="/"
              className="text-[13px] font-medium tracking-tight text-fg hover:text-fg-muted"
            >
              Momentum
            </Link>
            <span className="text-fg-faint">/</span>
            <span className="flex items-center gap-1 text-[13px] font-medium text-fg">
              <Target className="h-3.5 w-3.5 text-brand-500" />
              KPI
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/jd"
              className="mr-1 flex items-center gap-1 text-[12px] text-fg-subtle hover:text-fg"
            >
              <BadgeCheck className="h-3.5 w-3.5" />
              JD
            </Link>
            <button
              onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-1.5 rounded bg-brand-500 px-2.5 py-1 text-[12px] font-medium text-white hover:bg-brand-400"
            >
              <Plus className="h-3 w-3" />
              New KPI set
            </button>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5">
          <h1 className="text-xl font-medium tracking-tight text-fg">
            KPI Sets
          </h1>
          <p className="mt-0.5 text-[12px] text-fg-subtle">
            Manage annual work performance objectives and target levels
          </p>
        </div>

        {sortedSets.length === 0 ? (
          <div className="rounded-md border border-dashed border-line bg-subtle p-12 text-center">
            <Target className="mx-auto mb-3 h-8 w-8 text-fg-faint" />
            <h2 className="text-[14px] font-medium tracking-tight text-fg">
              No KPI sets yet
            </h2>
            <p className="mt-1 text-[12px] text-fg-subtle">
              Create your first KPI set to start tracking performance objectives.
            </p>
            <button
              onClick={() => setShowNew(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded bg-brand-500 px-2.5 py-1 text-[12px] font-medium text-white hover:bg-brand-400"
            >
              <Plus className="h-3 w-3" />
              New KPI set
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sortedSets.map((kpiSet) => {
              const totalWeight = kpiSet.items.reduce(
                (sum, i) => sum + i.weightage,
                0,
              );
              const achieved = kpiSetAchievedScore(kpiSet.items);
              const achievedPct = totalWeight > 0 ? (achieved / totalWeight) * 100 : 0;
              const { assessed, total } = kpiAssessedCount(kpiSet.items);
              const weightOk = totalWeight === 100;
              const weightOver = totalWeight > 100;
              const barColor =
                achievedPct >= 80
                  ? "bg-emerald-500"
                  : achievedPct >= 60
                    ? "bg-brand-500"
                    : achievedPct >= 40
                      ? "bg-amber-500"
                      : achievedPct > 0
                        ? "bg-rose-500"
                        : "bg-hover";
              return (
                <div
                  key={kpiSet.id}
                  className="group relative overflow-hidden rounded-md border border-line bg-surface transition-colors hover:border-line-strong"
                >
                  <Link
                    href={`/kpi/${kpiSet.year}`}
                    className="block p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold tabular-nums tracking-tight text-fg">
                            {kpiSet.year}
                          </span>
                          {kpiSet.year === CURRENT_YEAR && (
                            <span className="rounded-full bg-brand-500/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-500">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[12px] text-fg-subtle">
                          {kpiSet.title}
                        </div>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-fg-faint transition-transform group-hover:translate-x-0.5" />
                    </div>

                    {/* Achieved score */}
                    <div className="mt-3 flex items-end justify-between gap-2">
                      <div>
                        <div className="text-[10px] text-fg-faint">Achieved score</div>
                        <div className="tabular-nums text-[15px] font-semibold leading-tight text-fg">
                          {achieved.toFixed(1)}
                          <span className="text-[11px] font-normal text-fg-subtle">
                            /{totalWeight.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-fg-subtle">
                          {kpiSet.items.length} obj
                        </span>
                        {total > 0 && (
                          <span className="text-fg-faint">
                            · {assessed}/{total} assessed
                          </span>
                        )}
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 font-medium tabular-nums",
                            weightOk
                              ? "bg-emerald-500/10 text-emerald-600"
                              : weightOver
                                ? "bg-rose-500/10 text-rose-600"
                                : "bg-amber-500/10 text-amber-600",
                          )}
                        >
                          {totalWeight}%
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-hover">
                      <div
                        className={cn("h-full rounded-full transition-all", barColor)}
                        style={{ width: `${Math.min(100, achievedPct)}%` }}
                      />
                    </div>
                  </Link>

                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      if (
                        await confirm({
                          title: `Delete KPI ${kpiSet.year}?`,
                          message:
                            "This removes all objectives and targets for this year. Cannot be undone.",
                          tone: "danger",
                          confirmLabel: "Delete KPI set",
                        })
                      ) {
                        deleteSet(kpiSet.id);
                      }
                    }}
                    aria-label="Delete KPI set"
                    className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded bg-surface text-fg-faint opacity-0 transition-opacity hover:bg-rose-500/10 hover:text-rose-500 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="Create KPI set"
        footer={
          <>
            <button
              onClick={() => setShowNew(false)}
              className="rounded px-3 py-1 text-[12px] text-fg hover:bg-hover"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={
                !yearInput ||
                isNaN(parseInt(yearInput)) ||
                sets.some((s) => s.year === parseInt(yearInput, 10))
              }
              className="rounded bg-brand-500 px-3 py-1 text-[12px] font-medium text-white hover:bg-brand-400 disabled:opacity-40"
            >
              Create
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
              Year
            </div>
            <input
              autoFocus
              type="number"
              min="2000"
              max="2100"
              value={yearInput}
              onChange={(e) => setYearInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="w-full rounded border border-line bg-surface px-2.5 py-1.5 text-[13px] text-fg placeholder:text-fg-faint focus:border-brand-500/40 focus:outline-none"
            />
            {sets.some((s) => s.year === parseInt(yearInput, 10)) && (
              <div className="mt-1 text-[11px] text-amber-600">
                A KPI set for {yearInput} already exists.
              </div>
            )}
          </label>
        </div>
      </Modal>
    </div>
  );
}

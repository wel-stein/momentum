"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  ChevronDown,
  Circle,
  CircleCheck,
  CircleDot,
  NotebookPen,
  Target,
} from "lucide-react";
import { useJdStore } from "@/lib/jd-store";
import {
  moduleCounts,
  moduleProgress,
  responsibilityProgress,
  type JdDuty,
  type JdStatus,
} from "@/lib/jd-types";
import { SyncBanner } from "@/components/SyncBanner";
import { UserMenu } from "@/components/UserMenu";
import { cn } from "@/lib/utils";

const STATUS_ORDER: JdStatus[] = ["not_started", "in_progress", "achieved"];

const STATUS_META: Record<
  JdStatus,
  { label: string; className: string; Icon: typeof Circle }
> = {
  not_started: {
    label: "Not started",
    className: "bg-hover text-fg-subtle",
    Icon: Circle,
  },
  in_progress: {
    label: "In progress",
    className: "bg-amber-500/10 text-amber-600",
    Icon: CircleDot,
  },
  achieved: {
    label: "Achieved",
    className: "bg-emerald-500/10 text-emerald-600",
    Icon: CircleCheck,
  },
};

function nextStatus(status: JdStatus): JdStatus {
  const i = STATUS_ORDER.indexOf(status);
  return STATUS_ORDER[(i + 1) % STATUS_ORDER.length];
}

function progressColor(pct: number): string {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 60) return "bg-brand-500";
  if (pct >= 40) return "bg-amber-500";
  if (pct > 0) return "bg-rose-500";
  return "bg-hover";
}

function DutyRow({
  duty,
  onCycle,
  onEvidence,
}: {
  duty: JdDuty;
  onCycle: () => void;
  onEvidence: (evidence: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(duty.evidence ?? "");
  const meta = STATUS_META[duty.status];

  function save() {
    setEditing(false);
    if ((duty.evidence ?? "") !== draft) onEvidence(draft);
  }

  return (
    <li className="border-t border-line px-4 py-2.5 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12.5px] leading-relaxed text-fg">{duty.text}</p>
        <button
          onClick={onCycle}
          title="Click to change status"
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
            meta.className,
          )}
        >
          <meta.Icon className="h-3 w-3" />
          {meta.label}
        </button>
      </div>

      {editing ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Escape") save();
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
          }}
          rows={2}
          placeholder="Evidence: projects, metrics, links…"
          className="mt-1.5 w-full rounded border border-brand-500/40 bg-surface px-2 py-1.5 text-[12px] text-fg placeholder:text-fg-faint focus:outline-none"
        />
      ) : duty.evidence ? (
        <button
          onClick={() => {
            setDraft(duty.evidence ?? "");
            setEditing(true);
          }}
          className="mt-1 flex w-full items-start gap-1.5 rounded px-1 py-0.5 text-left text-[11.5px] text-fg-subtle hover:bg-hover"
        >
          <NotebookPen className="mt-0.5 h-3 w-3 shrink-0 text-fg-faint" />
          <span className="whitespace-pre-wrap">{duty.evidence}</span>
        </button>
      ) : (
        <button
          onClick={() => {
            setDraft("");
            setEditing(true);
          }}
          className="mt-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-[11px] text-fg-faint hover:bg-hover hover:text-fg-subtle"
        >
          <NotebookPen className="h-3 w-3" />
          Add evidence
        </button>
      )}
    </li>
  );
}

export function JdShell() {
  const module = useJdStore((s) => s.module);
  const setHydrated = useJdStore((s) => s.setHydrated);
  const setDutyStatus = useJdStore((s) => s.setDutyStatus);
  const setDutyEvidence = useJdStore((s) => s.setDutyEvidence);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void setHydrated();
  }, [setHydrated]);

  const overall = moduleProgress(module.items);
  const { achieved, inProgress, total } = moduleCounts(module.items);

  return (
    <div className="min-h-screen">
      <SyncBanner />
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
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
              <BadgeCheck className="h-3.5 w-3.5 text-brand-500" />
              JD
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/kpi"
              className="flex items-center gap-1 text-[12px] text-fg-subtle hover:text-fg"
            >
              <Target className="h-3.5 w-3.5" />
              KPI
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-medium tracking-tight text-fg">
            {module.role}
          </h1>
          <p className="mt-0.5 text-[12px] text-fg-subtle">
            Key responsibilities of the proposed role — track how far each one
            is already met. Click a status pill to cycle it, and attach
            evidence per duty.
          </p>
        </div>

        {/* Overall progress */}
        <div className="mb-6 rounded-md border border-line bg-surface p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-[10px] text-fg-faint">Overall readiness</div>
              <div className="tabular-nums text-2xl font-bold leading-tight tracking-tight text-fg">
                {overall.toFixed(0)}
                <span className="text-[13px] font-normal text-fg-subtle">%</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-fg-subtle">
              <span className="flex items-center gap-1">
                <CircleCheck className="h-3 w-3 text-emerald-500" />
                {achieved} achieved
              </span>
              <span className="flex items-center gap-1">
                <CircleDot className="h-3 w-3 text-amber-500" />
                {inProgress} in progress
              </span>
              <span className="text-fg-faint">· {total} duties</span>
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-hover">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                progressColor(overall),
              )}
              style={{ width: `${Math.min(100, overall)}%` }}
            />
          </div>
        </div>

        {/* Responsibilities */}
        <div className="space-y-3">
          {module.items.map((resp) => {
            const pct = responsibilityProgress(resp);
            const isCollapsed = collapsed[resp.id] ?? false;
            return (
              <section
                key={resp.id}
                className="overflow-hidden rounded-md border border-line bg-surface"
              >
                <button
                  onClick={() =>
                    setCollapsed((c) => ({ ...c, [resp.id]: !isCollapsed }))
                  }
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-subtle"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-brand-500/10 text-[11px] font-semibold tabular-nums text-brand-500">
                      {resp.no}
                    </span>
                    <h2 className="truncate text-[13px] font-medium tracking-tight text-fg">
                      {resp.title}
                    </h2>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <span className="tabular-nums text-[11px] font-medium text-fg-subtle">
                      {pct.toFixed(0)}%
                    </span>
                    <div className="h-1 w-20 overflow-hidden rounded-full bg-hover">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          progressColor(pct),
                        )}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-fg-faint transition-transform",
                        isCollapsed && "-rotate-90",
                      )}
                    />
                  </div>
                </button>

                {!isCollapsed && (
                  <ul>
                    {resp.duties.map((duty) => (
                      <DutyRow
                        key={duty.id}
                        duty={duty}
                        onCycle={() =>
                          setDutyStatus(
                            resp.id,
                            duty.id,
                            nextStatus(duty.status),
                          )
                        }
                        onEvidence={(evidence) =>
                          setDutyEvidence(resp.id, duty.id, evidence)
                        }
                      />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}

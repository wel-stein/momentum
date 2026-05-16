"use client";

import { useMemo } from "react";
import type { Board, Task } from "@/lib/types";
import { STATUSES, PRIORITY_META } from "@/lib/types";
import { cn, formatDateSmart, taskCode } from "@/lib/utils";

interface Props {
  board: Board;
  onOpenTask: (taskId: string) => void;
  filter: (t: Task) => boolean;
}

const DAY_MS = 1000 * 60 * 60 * 24;
const COL_PX = 52;
const NAME_COL = 240;
const HEADER_PX = 56;

const STATUS_BG: Record<string, string> = {
  not_started: "bg-zinc-600",
  in_progress: "bg-amber-500/80",
  stuck: "bg-rose-500/80",
  review: "bg-violet-500/80",
  done: "bg-emerald-500/80",
};

export function TimelineView({ board, onOpenTask, filter }: Props) {
  const allTasks = board.tasks.filter(filter);
  const dated = allTasks.filter((t) => t.startDate || t.dueDate);

  const { startMs, endMs, days } = useMemo(() => {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const t of dated) {
      const s = t.startDate
        ? new Date(t.startDate).getTime()
        : t.dueDate
        ? new Date(t.dueDate).getTime()
        : null;
      const e = t.dueDate
        ? new Date(t.dueDate).getTime()
        : t.startDate
        ? new Date(t.startDate).getTime()
        : null;
      if (s != null) min = Math.min(min, s);
      if (e != null) max = Math.max(max, e);
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      min = today.getTime() - 3 * DAY_MS;
      max = today.getTime() + 11 * DAY_MS;
    }
    min -= 2 * DAY_MS;
    max += 2 * DAY_MS;
    const ds: number[] = [];
    for (let t = min; t <= max; t += DAY_MS) ds.push(t);
    return { startMs: min, endMs: max, days: ds };
  }, [dated]);

  const widthPx = days.length * COL_PX;
  const todayLeft = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ms = today.getTime();
    if (ms < startMs || ms > endMs) return null;
    return ((ms - startMs) / DAY_MS) * COL_PX;
  })();

  const undatedCount = allTasks.length - dated.length;

  return (
    <div className="px-5 py-4">
      <div className="overflow-x-auto rounded-md border border-white/[0.07] bg-ink-900 scrollbar-thin">
        <div className="relative" style={{ width: widthPx + NAME_COL }}>
          <div
            className="sticky top-0 z-10 flex border-b border-white/[0.06] bg-ink-900"
            style={{ height: HEADER_PX }}
          >
            <div
              className="sticky left-0 z-20 shrink-0 border-r border-white/[0.06] bg-ink-900 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500"
              style={{ width: NAME_COL }}
            >
              Task
            </div>
            <div className="relative flex" style={{ width: widthPx }}>
              {days.map((d, i) => {
                const date = new Date(d);
                const isMonthStart = date.getDate() === 1 || i === 0;
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                return (
                  <div
                    key={d}
                    style={{ width: COL_PX }}
                    className={cn(
                      "shrink-0 border-r border-white/[0.04] text-center",
                      isWeekend && "bg-white/[0.015]",
                    )}
                  >
                    {isMonthStart && (
                      <div className="border-b border-white/[0.06] bg-white/[0.02] py-0.5 text-[10px] font-medium text-zinc-400">
                        {date.toLocaleDateString(undefined, {
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    )}
                    <div className="py-1.5 text-[10px] tabular-nums text-zinc-500">
                      <div className="uppercase">
                        {date.toLocaleDateString(undefined, {
                          weekday: "short",
                        })}
                      </div>
                      <div className="font-medium text-zinc-300">
                        {date.getDate()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {board.groups.map((g) => {
            const tasks = dated.filter((t) => t.groupId === g.id);
            if (tasks.length === 0) return null;
            return (
              <div key={g.id} className="border-b border-white/[0.06] last:border-b-0">
                <div
                  className="sticky left-0 z-10 flex items-center gap-2 border-b border-white/[0.04] bg-ink-900 px-3 py-1.5"
                  style={{ borderLeft: `2px solid ${g.color}` }}
                >
                  <span className="text-[12px] font-medium tracking-tight text-zinc-200">
                    {g.name}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500">
                    {tasks.length}
                  </span>
                </div>
                {tasks.map((t) => (
                  <Row
                    key={t.id}
                    task={t}
                    startMs={startMs}
                    widthPx={widthPx}
                    onOpen={() => onOpenTask(t.id)}
                  />
                ))}
              </div>
            );
          })}

          {todayLeft != null && (
            <div
              className="pointer-events-none absolute z-0"
              style={{
                left: NAME_COL + todayLeft,
                top: HEADER_PX,
                bottom: 0,
              }}
            >
              <div className="h-full w-px bg-brand-400/70" />
              <div className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-brand-400" />
            </div>
          )}
        </div>
      </div>

      {undatedCount > 0 && (
        <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-[11px] text-amber-200">
          {undatedCount} task{undatedCount === 1 ? " is" : "s are"} missing a
          start or due date and won't appear on the timeline.
        </div>
      )}
      {dated.length === 0 && (
        <div className="mt-3 rounded-md border border-dashed border-white/10 px-4 py-6 text-center text-[12px] text-zinc-500">
          Add start and due dates to tasks to see them on the timeline.
        </div>
      )}
    </div>
  );
}

function Row({
  task,
  startMs,
  widthPx,
  onOpen,
}: {
  task: Task;
  startMs: number;
  widthPx: number;
  onOpen: () => void;
}) {
  const s = task.startDate ? new Date(task.startDate).getTime() : null;
  const e = task.dueDate ? new Date(task.dueDate).getTime() : null;
  const start = s ?? (e as number);
  const end = e ?? (s as number);
  const left = ((start - startMs) / DAY_MS) * COL_PX;
  const span = Math.max(1, (end - start) / DAY_MS + 1);
  const width = Math.max(COL_PX - 4, span * COL_PX - 4);
  const status = STATUSES.find((x) => x.key === task.status) ?? STATUSES[0];
  const tone = STATUS_BG[status.key] ?? "bg-zinc-600";

  return (
    <div className="flex">
      <div
        className="sticky left-0 z-10 shrink-0 border-r border-white/[0.06] bg-ink-900 px-3 py-1.5"
        style={{ width: NAME_COL }}
      >
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-zinc-500">
            {taskCode(task.id)}
          </span>
        </div>
        <div className="truncate text-[12px] text-zinc-200">{task.title}</div>
        <div className="text-[10px] tabular-nums text-zinc-500">
          {formatDateSmart(task.startDate)}
          {task.startDate && task.dueDate && " → "}
          {formatDateSmart(task.dueDate)}
        </div>
      </div>
      <div className="relative" style={{ width: widthPx, height: 48 }}>
        <button
          onClick={onOpen}
          className={cn(
            "group absolute top-3 flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium text-white/95 shadow-sm transition hover:brightness-110",
            tone,
          )}
          style={{
            left: left + 2,
            width,
            borderLeft: `2px solid ${PRIORITY_META[task.priority].color}`,
          }}
          title={task.title}
        >
          <span className="truncate">{task.title}</span>
        </button>
      </div>
    </div>
  );
}

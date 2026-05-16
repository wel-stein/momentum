"use client";

import { useMemo } from "react";
import type { Board, Task } from "@/lib/types";
import { STATUSES, PRIORITY_META } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

interface Props {
  board: Board;
  onOpenTask: (taskId: string) => void;
  filter: (t: Task) => boolean;
}

const DAY_MS = 1000 * 60 * 60 * 24;
const COL_PX = 56;

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
    <div className="px-6 py-4">
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm scrollbar-thin">
        <div className="relative" style={{ width: widthPx + 240 }}>
          <div className="sticky top-0 z-10 flex border-b bg-slate-50">
            <div className="sticky left-0 z-20 w-60 shrink-0 border-r bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Task
            </div>
            <div
              className="relative flex"
              style={{ width: widthPx }}
            >
              {days.map((d, i) => {
                const date = new Date(d);
                const isMonthStart = date.getDate() === 1 || i === 0;
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                return (
                  <div
                    key={d}
                    style={{ width: COL_PX }}
                    className={cn(
                      "shrink-0 border-r text-center text-[10px]",
                      isWeekend && "bg-slate-100/60",
                    )}
                  >
                    {isMonthStart && (
                      <div className="border-b bg-slate-100 py-0.5 text-[10px] font-semibold text-slate-600">
                        {date.toLocaleDateString(undefined, {
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    )}
                    <div className="py-1.5 text-slate-500">
                      <div className="text-[10px] uppercase">
                        {date.toLocaleDateString(undefined, { weekday: "short" })}
                      </div>
                      <div className="font-semibold text-slate-700">
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
              <div key={g.id} className="border-b last:border-b-0">
                <div
                  className="sticky left-0 z-10 flex items-center gap-2 border-b bg-white px-3 py-1.5"
                  style={{ borderLeft: `4px solid ${g.color}` }}
                >
                  <span className="text-sm font-semibold text-slate-800">
                    {g.name}
                  </span>
                  <span className="text-xs text-slate-400">
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
                left: 240 + todayLeft,
                top: 48,
                bottom: 0,
              }}
            >
              <div className="h-full w-px bg-brand-500/60" />
            </div>
          )}
        </div>
      </div>

      {undatedCount > 0 && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {undatedCount} task{undatedCount === 1 ? " is" : "s are"} missing
          a start or due date and won't appear on the timeline.
        </div>
      )}
      {dated.length === 0 && (
        <div className="mt-3 rounded-md border border-dashed bg-white px-4 py-6 text-center text-sm text-slate-500">
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
  const start = s ?? e!;
  const end = e ?? s!;
  const left = ((start - startMs) / DAY_MS) * COL_PX;
  const span = Math.max(1, (end - start) / DAY_MS + 1);
  const width = span * COL_PX - 4;
  const status = STATUSES.find((x) => x.key === task.status) ?? STATUSES[0];

  return (
    <div className="flex">
      <div className="sticky left-0 z-10 w-60 shrink-0 border-r bg-white px-3 py-2">
        <div className="truncate text-sm text-slate-800">{task.title}</div>
        <div className="text-[11px] text-slate-400">
          {formatDate(task.startDate)}
          {task.startDate && task.dueDate && " → "}
          {formatDate(task.dueDate)}
        </div>
      </div>
      <div className="relative" style={{ width: widthPx, height: 52 }}>
        <button
          onClick={onOpen}
          className="absolute top-3 flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-white shadow-sm transition hover:brightness-110"
          style={{
            left: left + 2,
            width,
            backgroundColor: status.color,
            borderLeft: `3px solid ${PRIORITY_META[task.priority].color}`,
          }}
          title={task.title}
        >
          <span className="truncate">{task.title}</span>
        </button>
      </div>
    </div>
  );
}

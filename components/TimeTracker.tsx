"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Pause, Play, Plus, Trash2 } from "lucide-react";
import type { Board, Task, TimeEntry } from "@/lib/types";
import { useStore } from "@/lib/store";
import {
  entryDurationMs,
  formatDuration,
  formatStopwatch,
  parseDuration,
  runningEntry,
  totalDurationMs,
} from "@/lib/time";
import { cn, formatDateSmart } from "@/lib/utils";
import { useReadOnly } from "./BoardContext";
import { useConfirm } from "./ConfirmDialog";

/**
 * A clock that ticks only while something is running.
 *
 * A stopped total is a fixed number and re-rendering it every second would
 * be pure waste, so the interval is only mounted when `active` is true.
 */
function useNow(active: boolean, everyMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [active, everyMs]);
  return now;
}

/** Live total for a task — ticks while its stopwatch runs. */
function useTaskTime(task: Task) {
  const open = runningEntry(task.timeEntries);
  const now = useNow(!!open);
  return {
    open,
    running: !!open,
    totalMs: totalDurationMs(task.timeEntries, now),
    now,
  };
}

/**
 * Compact cell for board surfaces: the task's single total, plus a
 * start/stop control. Shows a live H:MM:SS reading while running so it is
 * obvious at a glance which task is counting.
 */
export function TimeCell({
  board,
  task,
  className,
}: {
  board: Board;
  task: Task;
  className?: string;
}) {
  const readOnly = useReadOnly();
  const startTimer = useStore((s) => s.startTimer);
  const stopTimer = useStore((s) => s.stopTimer);
  const { running, totalMs } = useTaskTime(task);

  const label = running ? formatStopwatch(totalMs) : formatDuration(totalMs);
  const idle = totalMs === 0 && !running;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {!readOnly && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (running) stopTimer(board.id, task.id);
            else startTimer(board.id, task.id);
          }}
          title={running ? "Stop the timer" : "Start the timer"}
          aria-label={running ? "Stop the timer" : "Start the timer"}
          className={cn(
            "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors",
            running
              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25"
              : "border-line bg-subtle text-fg-subtle hover:border-brand-500/40 hover:text-brand-500",
          )}
        >
          {running ? (
            <Pause className="h-2.5 w-2.5 fill-current" />
          ) : (
            <Play className="h-2.5 w-2.5 fill-current" />
          )}
        </button>
      )}
      <span
        className={cn(
          "tabular-nums text-[11px]",
          running
            ? "font-medium text-emerald-500"
            : idle
              ? "text-fg-faint"
              : "text-fg-subtle",
        )}
      >
        {idle ? "—" : label}
      </span>
    </div>
  );
}

/** Read-only badge for kanban cards — hidden entirely when nothing is logged. */
export function TimeBadge({ task }: { task: Task }) {
  const { running, totalMs } = useTaskTime(task);
  if (!running && totalMs === 0) return null;
  return (
    <span
      title={running ? "Timer running" : "Time logged"}
      className={cn(
        "inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] tabular-nums",
        running
          ? "bg-emerald-500/15 font-medium text-emerald-500"
          : "bg-hover text-fg-subtle",
      )}
    >
      <Clock className="h-2.5 w-2.5" />
      {running ? formatStopwatch(totalMs) : formatDuration(totalMs)}
    </span>
  );
}

/**
 * Full time panel for the task modal: the total, the stopwatch, a way to
 * type in untimed work, and the log of every stretch that makes up the
 * total — because a number nobody can explain is a number nobody trusts.
 */
export function TimePanel({ board, task }: { board: Board; task: Task }) {
  const readOnly = useReadOnly();
  const startTimer = useStore((s) => s.startTimer);
  const stopTimer = useStore((s) => s.stopTimer);
  const addManualTime = useStore((s) => s.addManualTime);
  const deleteTimeEntry = useStore((s) => s.deleteTimeEntry);
  const confirm = useConfirm();

  const { open, running, totalMs, now } = useTaskTime(task);
  const [draft, setDraft] = useState("");
  const [showLog, setShowLog] = useState(false);

  const parsed = useMemo(() => parseDuration(draft), [draft]);
  const invalid = draft.trim() !== "" && parsed === null;

  function commitManual() {
    if (parsed === null) return;
    addManualTime(board.id, task.id, parsed);
    setDraft("");
  }

  const entries = task.timeEntries;

  return (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {!readOnly && (
          <button
            onClick={() =>
              running ? stopTimer(board.id, task.id) : startTimer(board.id, task.id)
            }
            className={cn(
              "inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-[12px] font-medium transition-colors",
              running
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                : "border-line bg-hover text-fg hover:border-brand-500/40 hover:text-brand-500",
            )}
          >
            {running ? (
              <>
                <Pause className="h-3 w-3 fill-current" /> Stop
              </>
            ) : (
              <>
                <Play className="h-3 w-3 fill-current" /> Start
              </>
            )}
          </button>
        )}
        <span
          className={cn(
            "tabular-nums text-[15px] font-medium",
            running ? "text-emerald-500" : totalMs > 0 ? "text-fg" : "text-fg-faint",
          )}
        >
          {running ? formatStopwatch(totalMs) : formatDuration(totalMs)}
        </span>
        {entries.length > 0 && (
          <button
            onClick={() => setShowLog((v) => !v)}
            className="text-[11px] text-fg-subtle underline-offset-2 hover:text-fg hover:underline"
          >
            {showLog ? "Hide" : "Show"} {entries.length} entr
            {entries.length === 1 ? "y" : "ies"}
          </button>
        )}
      </div>

      {running && open && (
        <div className="text-[10px] text-fg-faint">
          Running since {new Date(open.startedAt).toLocaleTimeString()} ·
          this session {formatDuration(entryDurationMs(open, now))}
        </div>
      )}

      {!readOnly && (
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitManual();
              }
            }}
            placeholder="Add time — 90, 1.5h, 2h 30m"
            aria-label="Add time manually"
            aria-invalid={invalid}
            className={cn(
              "w-44 rounded border bg-surface px-2 py-1 text-[12px] text-fg placeholder:text-fg-faint focus:outline-none",
              invalid
                ? "border-rose-500/60"
                : "border-line focus:border-brand-500/40",
            )}
          />
          <button
            onClick={commitManual}
            disabled={parsed === null}
            className="inline-flex items-center gap-1 rounded bg-hover px-2 py-1 text-[11px] font-medium text-fg hover:bg-hover disabled:opacity-40"
          >
            <Plus className="h-3 w-3" /> Log
          </button>
          {invalid && (
            <span className="text-[10px] text-rose-400">
              Try 90, 1.5h, 2h 30m or 2:30
            </span>
          )}
        </div>
      )}

      {showLog && entries.length > 0 && (
        <ul className="space-y-1 rounded border border-line bg-subtle p-2">
          {entries.map((entry) => (
            <LogRow
              key={entry.id}
              entry={entry}
              board={board}
              now={now}
              readOnly={readOnly}
              onDelete={async () => {
                if (
                  await confirm({
                    title: "Remove this time entry?",
                    message: `The task's total drops by ${formatDuration(
                      entryDurationMs(entry, now),
                    )}.`,
                    tone: "danger",
                    confirmLabel: "Remove entry",
                  })
                ) {
                  deleteTimeEntry(board.id, task.id, entry.id);
                }
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function LogRow({
  entry,
  board,
  now,
  readOnly,
  onDelete,
}: {
  entry: TimeEntry;
  board: Board;
  now: number;
  readOnly: boolean;
  onDelete: () => void;
}) {
  const open = !entry.endedAt;
  const manual = entry.source === "manual";
  const who = entry.memberId
    ? board.members.find((m) => m.id === entry.memberId)?.name
    : null;
  // A timer entry knows when work actually started. A typed-in one does
  // not — its start is just "now minus the duration" — so show when it was
  // recorded rather than inventing a clock-in time.
  const stamp = new Date(manual ? entry.createdAt : entry.startedAt);

  return (
    <li className="group flex items-center gap-2 text-[11px]">
      <span
        className={cn(
          "w-16 shrink-0 tabular-nums",
          open ? "font-medium text-emerald-500" : "text-fg",
        )}
      >
        {formatDuration(entryDurationMs(entry, now))}
      </span>
      <span className="shrink-0 text-fg-subtle">
        {manual ? "logged " : ""}
        {formatDateSmart(manual ? entry.createdAt : entry.startedAt)}{" "}
        {stamp.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
      {manual && (
        <span className="shrink-0 rounded bg-hover px-1 text-[9px] uppercase tracking-wide text-fg-faint">
          manual
        </span>
      )}
      {open && (
        <span className="shrink-0 text-[9px] uppercase tracking-wide text-emerald-500">
          running
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-fg-faint">{who ?? ""}</span>
      {!readOnly && (
        <button
          onClick={onDelete}
          aria-label="Remove time entry"
          className="shrink-0 text-fg-faint opacity-0 transition-opacity hover:text-rose-400 focus:opacity-100 group-hover:opacity-100"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </li>
  );
}

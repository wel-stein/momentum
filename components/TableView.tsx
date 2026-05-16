"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import type { Board, Task } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn, formatDateSmart, isOverdue, taskCode } from "@/lib/utils";
import { StatusPill } from "./StatusPill";
import { PriorityPill } from "./PriorityPill";
import { AssigneePicker } from "./AssigneePicker";
import { useReadOnly } from "./BoardContext";

interface Props {
  board: Board;
  onOpenTask: (taskId: string) => void;
  filter: (t: Task) => boolean;
}

export function TableView({ board, onOpenTask, filter }: Props) {
  const readOnly = useReadOnly();
  const updateTask = useStore((s) => s.updateTask);
  const addTask = useStore((s) => s.addTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const toggleCollapsed = useStore((s) => s.toggleGroupCollapsed);
  const renameGroup = useStore((s) => s.renameGroup);
  const deleteGroup = useStore((s) => s.deleteGroup);

  return (
    <div className="space-y-5 px-5 py-4">
      {board.groups.map((g) => {
        const tasks = board.tasks.filter(
          (t) => t.groupId === g.id && filter(t),
        );
        return (
          <section
            key={g.id}
            className="overflow-hidden rounded-md border border-line"
          >
            <header className="flex items-center gap-1.5 border-b border-line bg-subtle px-2 py-1.5">
              <button
                onClick={() => {
                  if (readOnly) return;
                  toggleCollapsed(board.id, g.id);
                }}
                disabled={readOnly}
                className="rounded p-0.5 text-fg-subtle hover:bg-hover hover:text-fg disabled:hover:bg-transparent"
                aria-label="Toggle group"
              >
                {g.collapsed ? (
                  <ChevronRight className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: g.color }}
              />
              <input
                value={g.name}
                onChange={(e) => renameGroup(board.id, g.id, e.target.value)}
                readOnly={readOnly}
                className="border-0 bg-transparent px-0.5 py-0.5 text-[13px] font-medium tracking-tight text-fg focus:outline-none focus:ring-1 focus:ring-brand-500/40"
              />
              <span className="font-mono text-[10px] text-fg-subtle">
                {tasks.length}
              </span>
              {!readOnly && (
                <div className="ml-auto flex items-center gap-0.5">
                  <button
                    onClick={() => addTask(board.id, g.id, "New task")}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-fg-muted hover:bg-hover hover:text-fg"
                  >
                    <Plus className="h-3 w-3" /> Add task
                  </button>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `Delete group "${g.name}"? Tasks inside will be removed.`,
                        )
                      )
                        deleteGroup(board.id, g.id);
                    }}
                    aria-label="Delete group"
                    className="rounded p-1 text-fg-subtle hover:bg-rose-500/10 hover:text-rose-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </header>
            {!g.collapsed && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-[13px]">
                  <thead className="bg-subtle text-[10px] uppercase tracking-wider text-fg-subtle">
                    <tr className="border-b border-line">
                      <Th className="w-[64px] whitespace-nowrap">ID</Th>
                      <Th className="w-[48%] min-w-[320px]">Task</Th>
                      <Th className="w-[96px]">Owners</Th>
                      <Th className="w-[140px]">Status</Th>
                      <Th className="w-[120px]">Priority</Th>
                      <Th className="w-[88px]">Due</Th>
                      <Th className="w-[160px]">Tags</Th>
                      <Th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-4 text-center text-[11px] text-fg-subtle"
                        >
                          No tasks. Press{" "}
                          <span className="font-mono text-fg-muted">+ Add task</span>{" "}
                          to start.
                        </td>
                      </tr>
                    )}
                    {tasks.map((t) => (
                      <Row
                        key={t.id}
                        task={t}
                        board={board}
                        readOnly={readOnly}
                        onOpen={() => onOpenTask(t.id)}
                        onTitle={(v) => updateTask(board.id, t.id, { title: v })}
                        onDelete={() => deleteTask(board.id, t.id)}
                      />
                    ))}
                    {!readOnly && (
                      <tr>
                        <td colSpan={8} className="px-2 py-1">
                          <AddRow
                            onAdd={(title) => addTask(board.id, g.id, title)}
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-3 py-1.5 text-left font-medium text-fg-subtle",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Row({
  task,
  board,
  readOnly,
  onOpen,
  onTitle,
  onDelete,
}: {
  task: Task;
  board: Board;
  readOnly: boolean;
  onOpen: () => void;
  onTitle: (v: string) => void;
  onDelete: () => void;
}) {
  const updateTask = useStore((s) => s.updateTask);
  const overdue = isOverdue(task.dueDate);
  const [title, setTitle] = useState(task.title);

  useEffect(() => {
    setTitle(task.title);
  }, [task.title]);

  return (
    <tr className="group h-9 border-b border-line hover:bg-hover">
      <td className="whitespace-nowrap px-3">
        <button
          onClick={onOpen}
          className="whitespace-nowrap font-mono text-[11px] text-fg-subtle hover:text-fg"
        >
          {taskCode(task.id)}
        </button>
      </td>
      <td className="px-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (readOnly) return;
            if (title.trim() && title !== task.title) onTitle(title.trim());
            else setTitle(task.title);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          readOnly={readOnly}
          placeholder="Untitled task"
          title={task.title}
          className={cn(
            "w-full truncate rounded border border-transparent bg-transparent px-1 py-0.5 text-[13px] font-medium text-fg placeholder:font-normal placeholder:text-fg-faint",
            !readOnly &&
              "hover:border-line focus:border-brand-500/50 focus:bg-surface focus:outline-none focus:ring-1 focus:ring-brand-500/30",
          )}
        />
      </td>
      <td className="px-3">
        <AssigneePicker
          members={board.members}
          selected={task.assigneeIds}
          disabled={readOnly}
          onChange={(ids) =>
            updateTask(board.id, task.id, { assigneeIds: ids })
          }
        />
      </td>
      <td className="px-3">
        <StatusPill
          value={task.status}
          disabled={readOnly}
          onChange={(v) => updateTask(board.id, task.id, { status: v })}
        />
      </td>
      <td className="px-3">
        <PriorityPill
          value={task.priority}
          disabled={readOnly}
          onChange={(v) => updateTask(board.id, task.id, { priority: v })}
        />
      </td>
      <td className="px-3">
        {readOnly ? (
          <span
            className={cn(
              "text-[11px] tabular-nums",
              overdue && task.status !== "done"
                ? "text-rose-400"
                : "text-fg-muted",
            )}
          >
            {formatDateSmart(task.dueDate) || "—"}
          </span>
        ) : (
          <input
            type="date"
            value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
            onChange={(e) =>
              updateTask(board.id, task.id, {
                dueDate: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : undefined,
              })
            }
            className={cn(
              "rounded border-0 bg-transparent px-1 py-0.5 text-[11px] tabular-nums focus:bg-surface focus:outline-none focus:ring-1 focus:ring-brand-500/30",
              overdue && task.status !== "done"
                ? "text-rose-400"
                : "text-fg-muted",
            )}
          />
        )}
      </td>
      <td className="px-3">
        <div className="flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded bg-hover px-1.5 py-0.5 font-mono text-[10px] text-fg-muted"
            >
              {t}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-[10px] text-fg-faint">
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      </td>
      <td className="px-2 text-right">
        {!readOnly && (
          <button
            onClick={() => {
              if (confirm("Delete this task?")) onDelete();
            }}
            aria-label="Delete task"
            className="rounded p-1 text-fg-faint opacity-0 transition-opacity group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-400"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </td>
    </tr>
  );
}

function AddRow({ onAdd }: { onAdd: (title: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <input
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && val.trim()) {
          onAdd(val.trim());
          setVal("");
        }
      }}
      placeholder="+ Add task and press Enter"
      className="w-full rounded border border-transparent bg-transparent px-2 py-1 text-[12px] text-fg-subtle placeholder:text-fg-faint focus:border-brand-500/40 focus:bg-surface focus:text-fg focus:outline-none"
    />
  );
}

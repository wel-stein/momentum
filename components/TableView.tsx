"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Plus, Trash2 } from "lucide-react";
import type { Board, Task } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn, formatDate, isOverdue } from "@/lib/utils";
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
    <div className="space-y-6 px-6 py-4">
      {board.groups.map((g) => {
        const tasks = board.tasks.filter(
          (t) => t.groupId === g.id && filter(t),
        );
        return (
          <section
            key={g.id}
            className="overflow-hidden rounded-lg border bg-white shadow-sm"
          >
            <header
              style={{ borderLeftColor: g.color }}
              className="flex items-center gap-2 border-l-4 px-3 py-2"
            >
              <button
                onClick={() => {
                  if (readOnly) return;
                  toggleCollapsed(board.id, g.id);
                }}
                disabled={readOnly}
                className="rounded p-0.5 text-slate-500 hover:bg-slate-100 disabled:hover:bg-transparent"
                aria-label="Toggle group"
              >
                {g.collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              <input
                value={g.name}
                onChange={(e) => renameGroup(board.id, g.id, e.target.value)}
                readOnly={readOnly}
                className="border-0 bg-transparent px-1 py-0.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-brand-200"
                style={{ color: g.color }}
              />
              <span className="text-xs text-slate-400">
                {tasks.length} task{tasks.length === 1 ? "" : "s"}
              </span>
              {!readOnly && (
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => addTask(board.id, g.id, "New task")}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add task
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
                    className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </header>
            {!g.collapsed && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <Th className="w-[34%]">Task</Th>
                      <Th>Owners</Th>
                      <Th>Status</Th>
                      <Th>Priority</Th>
                      <Th>Due</Th>
                      <Th>Tags</Th>
                      <Th className="w-10"></Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {tasks.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-4 text-center text-xs text-slate-400"
                        >
                          No tasks yet — click “Add task” to start.
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
                        <td colSpan={7} className="px-3 py-1">
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
        "px-3 py-2 text-left font-semibold text-slate-500",
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

  // Sync local input when the task is renamed elsewhere (e.g. the modal).
  useEffect(() => {
    setTitle(task.title);
  }, [task.title]);

  return (
    <tr className="group hover:bg-slate-50">
      <td className="px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span
            className="grid h-5 w-1 shrink-0 rounded-sm"
            style={{
              backgroundColor:
                board.groups.find((g) => g.id === task.groupId)?.color ??
                "#cbd5e1",
            }}
            aria-hidden
          />
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
              "w-full truncate rounded border border-transparent bg-transparent px-1.5 py-1 text-sm font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-400",
              !readOnly &&
                "hover:border-slate-200 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100",
            )}
          />
          <button
            onClick={onOpen}
            aria-label="Open task details"
            className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-500 opacity-0 transition group-hover:opacity-100 hover:bg-brand-50 hover:text-brand-600"
          >
            <ExternalLink className="h-3 w-3" /> Open
          </button>
        </div>
      </td>
      <td className="px-3 py-1.5">
        <AssigneePicker
          members={board.members}
          selected={task.assigneeIds}
          disabled={readOnly}
          onChange={(ids) =>
            updateTask(board.id, task.id, { assigneeIds: ids })
          }
        />
      </td>
      <td className="px-3 py-1.5">
        <StatusPill
          value={task.status}
          disabled={readOnly}
          onChange={(v) => updateTask(board.id, task.id, { status: v })}
        />
      </td>
      <td className="px-3 py-1.5">
        <PriorityPill
          value={task.priority}
          disabled={readOnly}
          onChange={(v) => updateTask(board.id, task.id, { priority: v })}
        />
      </td>
      <td className="px-3 py-1.5">
        <input
          type="date"
          value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
          readOnly={readOnly}
          onChange={(e) =>
            updateTask(board.id, task.id, {
              dueDate: e.target.value
                ? new Date(e.target.value).toISOString()
                : undefined,
            })
          }
          className={cn(
            "rounded border-0 bg-transparent px-1 py-0.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-300",
            overdue && task.status !== "done" && "text-rose-600",
          )}
        />
      </td>
      <td className="px-3 py-1.5">
        <div className="flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
            >
              #{t}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-[10px] text-slate-400">
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-1.5 text-right">
        {!readOnly && (
          <button
            onClick={() => {
              if (confirm("Delete this task?")) onDelete();
            }}
            aria-label="Delete task"
            className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600 group-hover:text-slate-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
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
      className="w-full rounded border-0 bg-transparent px-1 py-1 text-xs text-slate-500 placeholder:text-slate-400 focus:bg-white focus:text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-200"
    />
  );
}

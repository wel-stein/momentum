"use client";

import { useEffect, useState } from "react";
import { Trash2, X } from "lucide-react";
import type { Board, Task } from "@/lib/types";
import { useStore } from "@/lib/store";
import { taskCode } from "@/lib/utils";
import { Modal } from "./Modal";
import { StatusPill } from "./StatusPill";
import { PriorityPill } from "./PriorityPill";
import { AssigneePicker } from "./AssigneePicker";
import { useReadOnly } from "./BoardContext";

interface Props {
  board: Board;
  taskId: string | null;
  onClose: () => void;
}

export function TaskModal({ board, taskId, onClose }: Props) {
  const readOnly = useReadOnly();
  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const moveTask = useStore((s) => s.moveTask);

  const task = board.tasks.find((t) => t.id === taskId) ?? null;
  const [tagDraft, setTagDraft] = useState("");

  useEffect(() => {
    setTagDraft("");
  }, [taskId]);

  if (!task) return null;

  const patch = (p: Partial<Task>) => {
    if (readOnly) return;
    updateTask(board.id, task.id, p);
  };

  return (
    <Modal
      open={!!taskId}
      onClose={onClose}
      size="lg"
      footer={
        <>
          {!readOnly && (
            <button
              onClick={() => {
                if (confirm("Delete this task?")) {
                  deleteTask(board.id, task.id);
                  onClose();
                }
              }}
              className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-[12px] text-rose-400 hover:bg-rose-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded bg-white/[0.06] px-3 py-1 text-[12px] font-medium text-zinc-200 hover:bg-white/[0.1]"
          >
            Close
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-[11px] tracking-tight text-zinc-500">
          <span className="font-mono">{taskCode(task.id)}</span>
        </div>
        <input
          value={task.title}
          onChange={(e) => patch({ title: e.target.value })}
          readOnly={readOnly}
          className="w-full rounded border-0 bg-transparent px-0 text-lg font-medium tracking-tight text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-0"
          placeholder="Task title"
        />

        <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-2 text-[12px]">
          <Field label="Group">
            <select
              value={task.groupId}
              disabled={readOnly}
              onChange={(e) => {
                if (readOnly) return;
                moveTask(board.id, task.id, e.target.value);
              }}
              className="rounded border border-white/10 bg-ink-900 px-2 py-1 text-[12px] text-zinc-200 focus:border-brand-500/40 focus:outline-none disabled:opacity-60"
            >
              {board.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <StatusPill
              size="md"
              value={task.status}
              disabled={readOnly}
              onChange={(v) => patch({ status: v })}
            />
          </Field>
          <Field label="Priority">
            <PriorityPill
              size="md"
              value={task.priority}
              disabled={readOnly}
              onChange={(v) => patch({ priority: v })}
            />
          </Field>
          <Field label="Assignees">
            <AssigneePicker
              members={board.members}
              selected={task.assigneeIds}
              disabled={readOnly}
              onChange={(ids) => patch({ assigneeIds: ids })}
            />
          </Field>
          <Field label="Start">
            <input
              type="date"
              value={task.startDate ? task.startDate.slice(0, 10) : ""}
              readOnly={readOnly}
              onChange={(e) =>
                patch({
                  startDate: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : undefined,
                })
              }
              className="rounded border border-white/10 bg-ink-900 px-2 py-1 text-[12px] tabular-nums text-zinc-200 focus:border-brand-500/40 focus:outline-none read-only:opacity-60"
            />
          </Field>
          <Field label="Due">
            <input
              type="date"
              value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
              readOnly={readOnly}
              onChange={(e) =>
                patch({
                  dueDate: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : undefined,
                })
              }
              className="rounded border border-white/10 bg-ink-900 px-2 py-1 text-[12px] tabular-nums text-zinc-200 focus:border-brand-500/40 focus:outline-none read-only:opacity-60"
            />
          </Field>
          <Field label="Tags">
            <div className="flex flex-wrap items-center gap-1">
              {task.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-zinc-300"
                >
                  {t}
                  {!readOnly && (
                    <button
                      onClick={() =>
                        patch({ tags: task.tags.filter((x) => x !== t) })
                      }
                      aria-label={`Remove ${t}`}
                      className="text-zinc-500 hover:text-rose-400"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </span>
              ))}
              {!readOnly && (
                <input
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && tagDraft.trim()) {
                      e.preventDefault();
                      if (!task.tags.includes(tagDraft.trim())) {
                        patch({ tags: [...task.tags, tagDraft.trim()] });
                      }
                      setTagDraft("");
                    }
                  }}
                  placeholder="Add tag…"
                  className="min-w-[100px] flex-1 rounded border-0 bg-transparent px-1 py-0.5 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-0"
                />
              )}
              {readOnly && task.tags.length === 0 && (
                <span className="text-[11px] text-zinc-600">No tags</span>
              )}
            </div>
          </Field>
        </div>

        <div>
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            Description
          </div>
          <textarea
            rows={5}
            value={task.description ?? ""}
            readOnly={readOnly}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder={readOnly ? "No description" : "Add more details…"}
            className="w-full resize-y rounded border border-white/10 bg-ink-900 px-3 py-2 text-[13px] leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-brand-500/40 focus:outline-none read-only:opacity-80"
          />
        </div>
      </div>
    </Modal>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex items-center text-[11px] uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="flex items-center">{children}</div>
    </>
  );
}

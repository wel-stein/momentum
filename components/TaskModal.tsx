"use client";

import { useEffect, useState } from "react";
import { Trash2, X } from "lucide-react";
import type { Board, Task } from "@/lib/types";
import { useStore } from "@/lib/store";
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
              className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Close
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <input
          value={task.title}
          onChange={(e) => patch({ title: e.target.value })}
          readOnly={readOnly}
          className="w-full rounded-md border-0 px-0 text-xl font-semibold focus:outline-none focus:ring-0"
          placeholder="Task title"
        />

        <div className="grid grid-cols-2 gap-4">
          <Field label="Group">
            <select
              value={task.groupId}
              disabled={readOnly}
              onChange={(e) => {
                if (readOnly) return;
                moveTask(board.id, task.id, e.target.value);
              }}
              className="w-full rounded-md border px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none disabled:bg-slate-50"
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
          <Field label="Start date">
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
              className="w-full rounded-md border px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none read-only:bg-slate-50"
            />
          </Field>
          <Field label="Due date">
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
              className="w-full rounded-md border px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none read-only:bg-slate-50"
            />
          </Field>
        </div>

        <Field label="Tags">
          <div className="flex flex-wrap items-center gap-1.5">
            {task.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
              >
                {t}
                {!readOnly && (
                  <button
                    onClick={() =>
                      patch({ tags: task.tags.filter((x) => x !== t) })
                    }
                    aria-label={`Remove ${t}`}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <X className="h-3 w-3" />
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
                className="min-w-[100px] flex-1 rounded-md border-0 px-1 py-0.5 text-sm focus:outline-none focus:ring-0"
              />
            )}
            {readOnly && task.tags.length === 0 && (
              <span className="text-xs text-slate-400">No tags</span>
            )}
          </div>
        </Field>

        <Field label="Description">
          <textarea
            rows={4}
            value={task.description ?? ""}
            readOnly={readOnly}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder={readOnly ? "No description" : "Add more details…"}
            className="w-full resize-y rounded-md border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 read-only:bg-slate-50"
          />
        </Field>
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
    <div>
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      {children}
    </div>
  );
}

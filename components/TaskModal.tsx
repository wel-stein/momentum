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
import { DatePicker } from "./DatePicker";
import { useReadOnly } from "./BoardContext";
import { isOverdue } from "@/lib/utils";

function isOverdueFlag(
  due: string | undefined,
  status: string,
): boolean {
  return Boolean(isOverdue(due) && status !== "done");
}

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

  const commitTags = () => {
    if (readOnly) return;
    const incoming = tagDraft
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (incoming.length === 0) return;
    const next = [...task.tags];
    for (const t of incoming) if (!next.includes(t)) next.push(t);
    if (next.length !== task.tags.length) patch({ tags: next });
    setTagDraft("");
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
            className="rounded bg-hover px-3 py-1 text-[12px] font-medium text-fg hover:bg-hover"
          >
            Close
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-[11px] tracking-tight text-fg-subtle">
          <span className="font-mono">{taskCode(task.id)}</span>
        </div>
        <input
          value={task.title}
          onChange={(e) => patch({ title: e.target.value })}
          readOnly={readOnly}
          className="w-full rounded border-0 bg-transparent px-0 text-lg font-medium tracking-tight text-fg placeholder:text-fg-faint focus:outline-none focus:ring-0"
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
              className="rounded border border-line bg-surface px-2 py-1 text-[12px] text-fg focus:border-brand-500/40 focus:outline-none disabled:opacity-60"
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
            <DatePicker
              size="md"
              value={task.startDate}
              disabled={readOnly}
              onChange={(v) => patch({ startDate: v })}
              label="Start date"
            />
          </Field>
          <Field label="Due">
            <DatePicker
              size="md"
              value={task.dueDate}
              disabled={readOnly}
              onChange={(v) => patch({ dueDate: v })}
              overdue={isOverdueFlag(task.dueDate, task.status)}
              label="Due date"
            />
          </Field>
          <Field label="Tags">
            <div className="flex w-full flex-col gap-2">
              {task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {task.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded bg-hover px-1.5 py-0.5 font-mono text-[10px] text-fg"
                    >
                      {t}
                      {!readOnly && (
                        <button
                          onClick={() =>
                            patch({ tags: task.tags.filter((x) => x !== t) })
                          }
                          aria-label={`Remove ${t}`}
                          className="text-fg-subtle hover:text-rose-400"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
              {!readOnly && (
                <div className="flex gap-2">
                  <input
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        commitTags();
                      }
                    }}
                    placeholder="Add tag — Enter or comma to add"
                    className="flex-1 rounded border border-line bg-surface px-2.5 py-1 text-[12px] text-fg placeholder:text-fg-faint focus:border-brand-500/40 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={commitTags}
                    disabled={!tagDraft.trim()}
                    className="rounded bg-hover px-2.5 py-1 text-[11px] font-medium text-fg hover:bg-hover disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              )}
              {readOnly && task.tags.length === 0 && (
                <span className="text-[11px] text-fg-faint">No tags</span>
              )}
            </div>
          </Field>
        </div>

        <div>
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
            Description
          </div>
          <textarea
            rows={5}
            value={task.description ?? ""}
            readOnly={readOnly}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder={readOnly ? "No description" : "Add more details…"}
            className="w-full resize-y rounded border border-line bg-surface px-3 py-2 text-[13px] leading-relaxed text-fg placeholder:text-fg-faint focus:border-brand-500/40 focus:outline-none read-only:opacity-80"
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
      <div className="flex items-center text-[11px] uppercase tracking-wider text-fg-subtle">
        {label}
      </div>
      <div className="flex items-center">{children}</div>
    </>
  );
}

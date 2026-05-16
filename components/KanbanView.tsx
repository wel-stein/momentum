"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { Calendar, Plus } from "lucide-react";
import type { Board, Task } from "@/lib/types";
import { STATUSES } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn, formatDate, isOverdue } from "@/lib/utils";
import { AvatarStack } from "./Avatar";
import { PRIORITY_META } from "@/lib/types";
import { useReadOnly } from "./BoardContext";

interface Props {
  board: Board;
  onOpenTask: (taskId: string) => void;
  filter: (t: Task) => boolean;
}

export function KanbanView({ board, onOpenTask, filter }: Props) {
  const readOnly = useReadOnly();
  const moveTask = useStore((s) => s.moveTask);
  const addTask = useStore((s) => s.addTask);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const onDragStart = (e: DragStartEvent) => {
    if (readOnly) return;
    setActiveId(String(e.active.id));
  };
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (readOnly) return;
    if (!e.over) return;
    const taskId = String(e.active.id);
    const [groupId, status] = String(e.over.id).split("::");
    const task = board.tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.groupId === groupId && task.status === status) return;
    moveTask(board.id, taskId, groupId, status as Task["status"]);
  };

  const activeTask = activeId
    ? board.tasks.find((t) => t.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="space-y-6 px-6 py-4">
        {board.groups.map((g) => (
          <section key={g.id}>
            <div className="mb-2 flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: g.color }}
              />
              <h3 className="text-sm font-semibold text-slate-800">{g.name}</h3>
              <span className="text-xs text-slate-400">
                {board.tasks.filter((t) => t.groupId === g.id).length}
              </span>
            </div>
            <div className="grid grid-flow-col auto-cols-[280px] gap-3 overflow-x-auto pb-3 scrollbar-thin">
              {STATUSES.map((s) => {
                const tasksHere = board.tasks
                  .filter(
                    (t) =>
                      t.groupId === g.id && t.status === s.key && filter(t),
                  );
                return (
                  <Column
                    key={s.key}
                    droppableId={`${g.id}::${s.key}`}
                    label={s.label}
                    color={s.color}
                    count={tasksHere.length}
                    onAdd={
                      readOnly
                        ? undefined
                        : () => addTask(board.id, g.id, "New task")
                    }
                  >
                    {tasksHere.map((t) => (
                      <Card
                        key={t.id}
                        task={t}
                        members={board.members}
                        onOpen={() => onOpenTask(t.id)}
                        readOnly={readOnly}
                      />
                    ))}
                  </Column>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="w-[260px] rotate-1">
            <CardInner task={activeTask} members={board.members} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  droppableId,
  label,
  color,
  count,
  onAdd,
  children,
}: {
  droppableId: string;
  label: string;
  color: string;
  count: number;
  onAdd?: () => void;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: droppableId });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg border bg-slate-50 p-2 transition",
        isOver && "border-brand-400 bg-brand-50/50",
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1.5 pt-1">
        <div className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            {label}
          </span>
          <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
            {count}
          </span>
        </div>
        {onAdd && (
          <button
            onClick={onAdd}
            aria-label="Add task"
            className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="flex min-h-[60px] flex-col gap-2">{children}</div>
    </div>
  );
}

function Card({
  task,
  members,
  onOpen,
  readOnly,
}: {
  task: Task;
  members: Board["members"];
  onOpen: () => void;
  readOnly: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    disabled: readOnly,
  });
  return (
    <div
      ref={setNodeRef}
      {...(readOnly ? {} : { ...listeners, ...attributes })}
      onClick={onOpen}
      className={cn(
        readOnly ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-30",
      )}
    >
      <CardInner task={task} members={members} />
    </div>
  );
}

function CardInner({
  task,
  members,
}: {
  task: Task;
  members: Board["members"];
}) {
  const assignees = members.filter((m) => task.assigneeIds.includes(m.id));
  const overdue = isOverdue(task.dueDate);
  return (
    <div className="rounded-lg border bg-white p-3 shadow-sm hover:shadow">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="text-sm font-medium text-slate-900">{task.title}</div>
        <span
          className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: PRIORITY_META[task.priority].color }}
          title={`${PRIORITY_META[task.priority].label} priority`}
        />
      </div>
      {task.tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
            >
              #{t}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between">
        {task.dueDate ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px]",
              overdue && task.status !== "done"
                ? "text-rose-600"
                : "text-slate-500",
            )}
          >
            <Calendar className="h-3 w-3" /> {formatDate(task.dueDate)}
          </span>
        ) : (
          <span />
        )}
        {assignees.length > 0 && (
          <AvatarStack members={assignees} max={3} size="xs" />
        )}
      </div>
    </div>
  );
}

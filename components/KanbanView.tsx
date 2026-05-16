"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import type { Board, Task } from "@/lib/types";
import { STATUSES } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn, formatDateSmart, isOverdue, taskCode } from "@/lib/utils";
import { AvatarStack } from "./Avatar";
import { PriorityIndicator } from "./PriorityPill";
import { useReadOnly } from "./BoardContext";

interface Props {
  board: Board;
  onOpenTask: (taskId: string) => void;
  filter: (t: Task) => boolean;
}

const STATUS_DOT: Record<string, string> = {
  not_started: "bg-zinc-500",
  in_progress: "bg-amber-400",
  stuck: "bg-rose-500",
  review: "bg-violet-400",
  done: "bg-emerald-500",
};

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
      <div className="space-y-5 px-5 py-4">
        {board.groups.map((g) => (
          <section key={g.id}>
            <div className="mb-2 flex items-center gap-2 px-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: g.color }}
              />
              <h3 className="text-[13px] font-medium tracking-tight text-zinc-200">
                {g.name}
              </h3>
              <span className="font-mono text-[10px] text-zinc-500">
                {board.tasks.filter((t) => t.groupId === g.id).length}
              </span>
            </div>
            <div className="grid grid-flow-col auto-cols-[288px] gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {STATUSES.map((s) => {
                const tasksHere = board.tasks.filter(
                  (t) =>
                    t.groupId === g.id && t.status === s.key && filter(t),
                );
                return (
                  <Column
                    key={s.key}
                    droppableId={`${g.id}::${s.key}`}
                    label={s.label}
                    statusKey={s.key}
                    count={tasksHere.length}
                    onAdd={
                      readOnly
                        ? undefined
                        : () => addTask(board.id, g.id, "New task")
                    }
                  >
                    {tasksHere.length === 0 ? (
                      <EmptyDropZone />
                    ) : (
                      tasksHere.map((t) => (
                        <Card
                          key={t.id}
                          task={t}
                          members={board.members}
                          onOpen={() => onOpenTask(t.id)}
                          readOnly={readOnly}
                        />
                      ))
                    )}
                  </Column>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <div className="w-[272px] rotate-[2deg]">
            <CardInner task={activeTask} members={board.members} dragging />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  droppableId,
  label,
  statusKey,
  count,
  onAdd,
  children,
}: {
  droppableId: string;
  label: string;
  statusKey: string;
  count: number;
  onAdd?: () => void;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: droppableId });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-md border border-white/[0.06] bg-white/[0.015] p-1.5 transition-colors",
        isOver && "border-brand-500/40 bg-brand-500/[0.04]",
      )}
    >
      <div className="mb-1.5 flex items-center justify-between px-1.5 pt-1">
        <div className="flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[statusKey])} />
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            {label}
          </span>
          <span className="font-mono text-[10px] text-zinc-500">{count}</span>
        </div>
        {onAdd && (
          <button
            onClick={onAdd}
            aria-label="Add task"
            className="rounded p-0.5 text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="flex min-h-[80px] flex-col gap-1.5">{children}</div>
    </div>
  );
}

function EmptyDropZone() {
  return (
    <div className="flex h-16 items-center justify-center rounded border border-dashed border-white/5 text-[10px] text-zinc-600">
      Drop tasks here
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
  dragging,
}: {
  task: Task;
  members: Board["members"];
  dragging?: boolean;
}) {
  const assignees = members.filter((m) => task.assigneeIds.includes(m.id));
  const overdue = isOverdue(task.dueDate);
  return (
    <div
      className={cn(
        "rounded-md border border-white/[0.07] bg-ink-850 p-2.5 transition-colors",
        !dragging && "hover:border-white/[0.14] hover:bg-ink-800",
        dragging && "border-white/20 shadow-2xl shadow-black/60",
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="font-mono text-[10px] tracking-tight text-zinc-500">
          {taskCode(task.id)}
        </span>
        <PriorityIndicator value={task.priority} />
      </div>
      <h3 className="line-clamp-2 text-[13px] font-medium leading-snug text-zinc-100">
        {task.title}
      </h3>
      {task.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400"
            >
              {t}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-[10px] text-zinc-600">
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      )}
      <div className="mt-2.5 flex items-center justify-between">
        {task.dueDate ? (
          <span
            className={cn(
              "text-[11px] tabular-nums",
              overdue && task.status !== "done"
                ? "text-rose-400"
                : "text-zinc-500",
            )}
          >
            {formatDateSmart(task.dueDate)}
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

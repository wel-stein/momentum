"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  LayoutGrid,
  Plus,
  Search,
  Table as TableIcon,
  UserPlus,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Task, ViewType } from "@/lib/types";
import { BOARD_EMOJIS, STATUSES } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AvatarStack } from "./Avatar";
import { KanbanView } from "./KanbanView";
import { TableView } from "./TableView";
import { TimelineView } from "./TimelineView";
import { TaskModal } from "./TaskModal";
import { InviteMembersModal } from "./InviteMembersModal";

interface Props {
  boardId: string;
}

export function BoardShell({ boardId }: Props) {
  const hydrated = useStore((s) => s.hydrated);
  const setHydrated = useStore((s) => s.setHydrated);
  const board = useStore((s) => s.boards.find((b) => b.id === boardId));
  const setView = useStore((s) => s.setView);
  const renameBoard = useStore((s) => s.renameBoard);
  const updateEmoji = useStore((s) => s.updateBoardEmoji);
  const addGroup = useStore((s) => s.addGroup);

  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [titleDraft, setTitleDraft] = useState("");

  useEffect(() => {
    setHydrated();
  }, [setHydrated]);

  useEffect(() => {
    if (board) setTitleDraft(board.name);
  }, [board?.id, board?.name]);

  const filter = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (t: Task) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (assigneeFilter !== "all" && !t.assigneeIds.includes(assigneeFilter))
        return false;
      if (q) {
        const hay = (
          t.title +
          " " +
          (t.description ?? "") +
          " " +
          t.tags.join(" ")
        ).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    };
  }, [search, statusFilter, assigneeFilter]);

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }
  if (!board) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <div className="text-slate-500">Board not found.</div>
        <Link
          href="/"
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700"
        >
          Back home
        </Link>
      </div>
    );
  }

  const tasks = board.tasks;
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-white">
        <div className="flex items-center gap-3 px-6 py-3">
          <Link
            href="/"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="relative">
            <button
              onClick={() => setShowEmoji((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-xl hover:bg-slate-200"
              aria-label="Change emoji"
            >
              {board.emoji}
            </button>
            {showEmoji && (
              <div className="absolute left-0 top-full z-40 mt-1 grid grid-cols-6 gap-1 rounded-md border bg-white p-2 shadow-lg">
                {BOARD_EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => {
                      updateEmoji(board.id, e);
                      setShowEmoji(false);
                    }}
                    className="grid h-8 w-8 place-items-center rounded text-lg hover:bg-slate-100"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => {
              const v = titleDraft.trim();
              if (v && v !== board.name) renameBoard(board.id, v);
              else setTitleDraft(board.name);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="rounded border-0 bg-transparent px-1 py-0.5 text-lg font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-300"
          />
          <div className="ml-2 hidden items-center gap-3 sm:flex">
            <AvatarStack members={board.members} max={4} size="sm" />
            <button
              onClick={() => setShowInvite(true)}
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <UserPlus className="h-3.5 w-3.5" /> Invite
            </button>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-brand-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-medium text-slate-600">
                {progress}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t bg-slate-50 px-6 py-2">
          <ViewSwitch
            value={board.view}
            onChange={(v) => setView(board.id, v)}
          />
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="w-56 rounded-md border bg-white py-1 pl-7 pr-2 text-xs focus:border-brand-500 focus:outline-none"
            />
          </div>
          <SelectField
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All statuses" },
              ...STATUSES.map((s) => ({ value: s.key, label: s.label })),
            ]}
          />
          <SelectField
            value={assigneeFilter}
            onChange={setAssigneeFilter}
            options={[
              { value: "all", label: "All assignees" },
              ...board.members.map((m) => ({ value: m.id, label: m.name })),
            ]}
          />
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => {
                const name = prompt("New group name");
                if (name?.trim()) addGroup(board.id, name.trim());
              }}
              className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-700"
            >
              <Plus className="h-3.5 w-3.5" /> Add group
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-slate-50">
        {board.view === "kanban" && (
          <KanbanView
            board={board}
            onOpenTask={setOpenTaskId}
            filter={filter}
          />
        )}
        {board.view === "table" && (
          <TableView
            board={board}
            onOpenTask={setOpenTaskId}
            filter={filter}
          />
        )}
        {board.view === "timeline" && (
          <TimelineView
            board={board}
            onOpenTask={setOpenTaskId}
            filter={filter}
          />
        )}
      </main>

      <TaskModal
        board={board}
        taskId={openTaskId}
        onClose={() => setOpenTaskId(null)}
      />
      <InviteMembersModal
        board={board}
        open={showInvite}
        onClose={() => setShowInvite(false)}
      />
    </div>
  );
}

function ViewSwitch({
  value,
  onChange,
}: {
  value: ViewType;
  onChange: (v: ViewType) => void;
}) {
  const items: { key: ViewType; label: string; icon: React.ReactNode }[] = [
    { key: "kanban", label: "Kanban", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { key: "table", label: "Table", icon: <TableIcon className="h-3.5 w-3.5" /> },
    { key: "timeline", label: "Timeline", icon: <Calendar className="h-3.5 w-3.5" /> },
  ];
  return (
    <div className="inline-flex rounded-md border bg-white p-0.5 shadow-sm">
      {items.map((i) => (
        <button
          key={i.key}
          onClick={() => onChange(i.key)}
          className={cn(
            "inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition",
            value === i.key
              ? "bg-brand-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50",
          )}
        >
          {i.icon} {i.label}
        </button>
      ))}
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-md border bg-white py-1 pl-2 pr-7 text-xs focus:border-brand-500 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

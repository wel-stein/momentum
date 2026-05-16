"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Eye,
  LayoutGrid,
  Plus,
  Search,
  Share2,
  Table as TableIcon,
  UserPlus,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Board, Task, ViewType } from "@/lib/types";
import { BOARD_EMOJIS, STATUSES } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AvatarStack } from "./Avatar";
import { KanbanView } from "./KanbanView";
import { TableView } from "./TableView";
import { TimelineView } from "./TimelineView";
import { TaskModal } from "./TaskModal";
import { InviteMembersModal } from "./InviteMembersModal";
import { ShareModal } from "./ShareModal";
import { SyncBanner } from "./SyncBanner";
import { BoardProvider } from "./BoardContext";
import { UserMenu } from "./UserMenu";
import { useAuth, useUser } from "./AuthProvider";

interface Props {
  boardId: string;
  /** When provided, render this board directly (skip the store lookup). */
  board?: Board;
  /** Read-only mode disables every mutation in the UI. */
  readOnly?: boolean;
}

export function BoardShell({
  boardId,
  board: boardOverride,
  readOnly: readOnlyProp = false,
}: Props) {
  const hydrated = useStore((s) => s.hydrated);
  const setHydrated = useStore((s) => s.setHydrated);
  const boardFromStore = useStore((s) =>
    s.boards.find((b) => b.id === boardId),
  );
  const board = boardOverride ?? boardFromStore;
  const setView = useStore((s) => s.setView);
  const renameBoard = useStore((s) => s.renameBoard);
  const updateEmoji = useStore((s) => s.updateBoardEmoji);
  const addGroup = useStore((s) => s.addGroup);
  const auth = useAuth();
  const user = useUser();
  // Sharing context, or signed-out visitors, both render as view-only.
  const readOnly = readOnlyProp || !user;

  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [titleDraft, setTitleDraft] = useState("");
  const [localView, setLocalView] = useState<ViewType | null>(null);

  useEffect(() => {
    // No need to load the whole boards list in read-only / share mode.
    if (boardOverride) return;
    if (!auth.ready) return;
    void setHydrated();
  }, [setHydrated, boardOverride, auth.ready]);

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

  if (!boardOverride && (!auth.ready || !hydrated)) {
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
    <BoardProvider value={{ readOnly }}>
    <div className="flex min-h-screen flex-col">
      <SyncBanner />
      {readOnlyProp && (
        <div className="border-b border-brand-200 bg-brand-50 px-4 py-1.5 text-center text-xs text-brand-800">
          <Eye className="mr-1 inline h-3 w-3" />
          You're viewing a shared board in read-only mode.
        </div>
      )}
      {!readOnlyProp && !user && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900">
          <Eye className="mr-1 inline h-3 w-3" />
          Sign in to add groups, create tasks, or invite teammates.
        </div>
      )}
      <header className="border-b bg-white">
        <div className="flex items-center gap-3 px-6 py-3">
          {!readOnly && (
            <Link
              href="/"
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <div className="relative">
            <button
              onClick={() => !readOnly && setShowEmoji((v) => !v)}
              disabled={readOnly}
              className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-xl hover:bg-slate-200 disabled:hover:bg-slate-100"
              aria-label="Change emoji"
            >
              {board.emoji}
            </button>
            {showEmoji && !readOnly && (
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
            readOnly={readOnly}
            onBlur={() => {
              if (readOnly) return;
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
            {!readOnly && (
              <>
                <button
                  onClick={() => setShowInvite(true)}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Invite
                </button>
                <button
                  onClick={() => setShowShare(true)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-slate-50",
                    board.shareToken
                      ? "border-brand-300 text-brand-700"
                      : "text-slate-700",
                  )}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {board.shareToken ? "Sharing" : "Share"}
                </button>
              </>
            )}
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
            {!readOnlyProp && <UserMenu />}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t bg-slate-50 px-6 py-2">
          <ViewSwitch
            value={readOnly ? localView ?? board.view : board.view}
            onChange={(v) => {
              if (readOnly) setLocalView(v);
              else setView(board.id, v);
            }}
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
          {!readOnly && (
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
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-slate-50">
        {(() => {
          const activeView = readOnly ? localView ?? board.view : board.view;
          if (activeView === "kanban")
            return <KanbanView board={board} onOpenTask={setOpenTaskId} filter={filter} />;
          if (activeView === "table")
            return <TableView board={board} onOpenTask={setOpenTaskId} filter={filter} />;
          return <TimelineView board={board} onOpenTask={setOpenTaskId} filter={filter} />;
        })()}
      </main>

      <TaskModal
        board={board}
        taskId={openTaskId}
        onClose={() => setOpenTaskId(null)}
      />
      {!readOnly && (
        <>
          <InviteMembersModal
            board={board}
            open={showInvite}
            onClose={() => setShowInvite(false)}
          />
          <ShareModal
            board={board}
            open={showShare}
            onClose={() => setShowShare(false)}
          />
        </>
      )}
    </div>
    </BoardProvider>
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

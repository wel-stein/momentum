"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Eye,
  LayoutGrid,
  Mail,
  Plus,
  Search,
  Share2,
  Table as TableIcon,
  UserPlus,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Board, Task, ViewType } from "@/lib/types";
import { BOARD_EMOJIS, STATUSES } from "@/lib/types";
import { cn, taskCode } from "@/lib/utils";
import { AvatarStack } from "./Avatar";
import { KanbanView } from "./KanbanView";
import { TableView } from "./TableView";
import { TimelineView } from "./TimelineView";
import { TaskModal } from "./TaskModal";
import { InviteMembersModal } from "./InviteMembersModal";
import { ShareModal } from "./ShareModal";
import { WeeklyReportModal } from "./WeeklyReportModal";
import { Modal } from "./Modal";
import { RealtimeSync } from "./RealtimeSync";
import { SyncBanner } from "./SyncBanner";
import { BoardProvider } from "./BoardContext";
import { UserMenu } from "./UserMenu";
import { Kbd } from "./Kbd";
import { useAuth, useUser } from "./AuthProvider";

interface Props {
  boardId: string;
  board?: Board;
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
  const readOnly = readOnlyProp || !user;

  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [titleDraft, setTitleDraft] = useState("");
  const [localView, setLocalView] = useState<ViewType | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (boardOverride) return;
    if (!auth.ready) return;
    void setHydrated();
  }, [setHydrated, boardOverride, auth.ready]);

  useEffect(() => {
    if (board) setTitleDraft(board.name);
  }, [board?.id, board?.name]);

  // `/` focuses search.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable)
          return;
      }
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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
          t.tags.join(" ") +
          " " +
          taskCode(t.id)
        ).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    };
  }, [search, statusFilter, assigneeFilter]);

  if (!boardOverride && (!auth.ready || !hydrated)) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-fg-faint">
        Loading…
      </div>
    );
  }
  if (!board) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <div className="text-sm text-fg-subtle">Board not found.</div>
        <Link
          href="/"
          className="rounded bg-brand-500 px-3 py-1 text-[12px] font-medium text-white hover:bg-brand-400"
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
          <div className="border-b border-brand-500/20 bg-brand-500/[0.06] px-4 py-1 text-center text-[11px] text-brand-200">
            <Eye className="mr-1 inline h-3 w-3" />
            Viewing a shared board · read-only
          </div>
        )}
        {!readOnlyProp && !user && (
          <div className="border-b border-amber-500/20 bg-amber-500/[0.06] px-4 py-1 text-center text-[11px] text-amber-200">
            <Eye className="mr-1 inline h-3 w-3" />
            Sign in to add groups, create tasks, or invite teammates.
          </div>
        )}
        <header className="border-b border-line">
          <div className="flex items-center gap-2 px-5 py-2">
            {!readOnlyProp && (
              <Link
                href="/"
                className="rounded p-1 text-fg-subtle hover:bg-hover hover:text-fg"
                aria-label="Back"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            )}
            <div className="relative">
              <button
                onClick={() => !readOnly && setShowEmoji((v) => !v)}
                disabled={readOnly}
                className="grid h-7 w-7 place-items-center rounded bg-hover text-base hover:bg-hover disabled:hover:bg-hover"
                aria-label="Change emoji"
              >
                {board.emoji}
              </button>
              {showEmoji && !readOnly && (
                <div
                  className="absolute left-0 top-full z-40 mt-1 grid w-max gap-1 rounded-md border border-line bg-elevated p-2 shadow-xl shadow-black/40"
                  // Pin to six 36px columns instead of grid-cols-6's
                  // 1fr-minmax, which would let columns shrink past content
                  // and stack the emojis vertically under a constrained parent.
                  style={{ gridTemplateColumns: "repeat(6, 2.25rem)" }}
                >
                  {BOARD_EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => {
                        updateEmoji(board.id, e);
                        setShowEmoji(false);
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded text-xl leading-none hover:bg-hover"
                    >
                      <span className="leading-none">{e}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex min-w-0 items-center gap-1.5">
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
                className="min-w-0 rounded border border-transparent bg-transparent px-1 py-0.5 text-[14px] font-medium tracking-tight text-fg hover:border-line focus:border-brand-500/40 focus:bg-surface focus:outline-none"
              />
              <span
                title="Board ID"
                className="shrink-0 rounded border border-line bg-subtle px-1.5 py-0.5 font-mono text-[10px] tracking-tight text-fg-subtle"
              >
                {taskCode(board.id)}
              </span>
            </div>
            <div className="ml-3 hidden items-center gap-2 sm:flex">
              <AvatarStack members={board.members} max={4} size="sm" />
              {!readOnly && (
                <>
                  <button
                    onClick={() => setShowInvite(true)}
                    className="inline-flex items-center gap-1 rounded border border-line bg-hover px-2 py-1 text-[11px] font-medium text-fg hover:bg-hover"
                  >
                    <UserPlus className="h-3 w-3" /> Invite
                  </button>
                  <button
                    onClick={() => setShowShare(true)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-medium",
                      board.shareToken
                        ? "border-brand-400/40 bg-brand-500/[0.08] text-brand-200 hover:bg-brand-500/[0.12]"
                        : "border-line bg-hover text-fg hover:bg-hover",
                    )}
                  >
                    <Share2 className="h-3 w-3" />
                    {board.shareToken ? "Sharing" : "Share"}
                  </button>
                  <button
                    onClick={() => setShowReport(true)}
                    className="inline-flex items-center gap-1 rounded border border-line bg-hover px-2 py-1 text-[11px] font-medium text-fg hover:bg-hover"
                    title="Send weekly progress report by email"
                  >
                    <Mail className="h-3 w-3" />
                    Weekly report
                  </button>
                </>
              )}
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden items-center gap-2 sm:flex">
                <div className="h-1 w-32 overflow-hidden rounded-full bg-hover">
                  <div
                    className="h-full bg-brand-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[11px] tabular-nums text-fg-subtle">
                  {progress}%
                </span>
              </div>
              {!readOnlyProp && <UserMenu />}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-1.5">
            <ViewSwitch
              value={readOnly ? localView ?? board.view : board.view}
              onChange={(v) => {
                if (readOnly) setLocalView(v);
                else setView(board.id, v);
              }}
            />
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-fg-subtle" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks"
                className="w-56 rounded border border-line bg-subtle py-1 pl-7 pr-12 text-[11px] text-fg placeholder:text-fg-faint focus:border-brand-500/40 focus:bg-surface focus:outline-none"
              />
              <Kbd className="absolute right-1.5 top-1/2 -translate-y-1/2">
                /
              </Kbd>
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
                    setNewGroupName("");
                    setShowAddGroup(true);
                  }}
                  className="inline-flex items-center gap-1 rounded bg-brand-500 px-2 py-1 text-[11px] font-medium text-white hover:bg-brand-400"
                >
                  <Plus className="h-3 w-3" /> Add group
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {(() => {
            const activeView = readOnly ? localView ?? board.view : board.view;
            if (activeView === "kanban")
              return (
                <KanbanView
                  board={board}
                  onOpenTask={setOpenTaskId}
                  filter={filter}
                />
              );
            if (activeView === "table")
              return (
                <TableView
                  board={board}
                  onOpenTask={setOpenTaskId}
                  filter={filter}
                />
              );
            return (
              <TimelineView
                board={board}
                onOpenTask={setOpenTaskId}
                filter={filter}
              />
            );
          })()}
        </main>

        {/* Realtime is only useful in edit-mode (the share/read-only page
            uses a one-shot fetch and shouldn't need to react to changes). */}
        {!readOnlyProp && !boardOverride && <RealtimeSync boardId={board.id} />}

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
            <WeeklyReportModal
              board={board}
              open={showReport}
              onClose={() => setShowReport(false)}
              senderName={user?.name}
            />
            <Modal
              open={showAddGroup}
              onClose={() => setShowAddGroup(false)}
              title="New group"
              size="sm"
              footer={
                <>
                  <button
                    onClick={() => setShowAddGroup(false)}
                    className="rounded px-3 py-1 text-[12px] text-fg hover:bg-hover"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const v = newGroupName.trim();
                      if (!v) return;
                      addGroup(board.id, v);
                      setNewGroupName("");
                      setShowAddGroup(false);
                    }}
                    disabled={!newGroupName.trim()}
                    className="rounded bg-brand-500 px-3 py-1 text-[12px] font-medium text-white hover:bg-brand-400 disabled:opacity-50"
                  >
                    Add group
                  </button>
                </>
              }
            >
              <label className="block">
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
                  Name
                </div>
                <input
                  autoFocus
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newGroupName.trim()) {
                      addGroup(board.id, newGroupName.trim());
                      setNewGroupName("");
                      setShowAddGroup(false);
                    }
                  }}
                  placeholder="e.g. This sprint"
                  className="w-full rounded border border-line bg-surface px-2.5 py-1.5 text-[13px] text-fg placeholder:text-fg-faint focus:border-brand-500/40 focus:outline-none"
                />
              </label>
            </Modal>
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
    { key: "kanban", label: "Board", icon: <LayoutGrid className="h-3 w-3" /> },
    { key: "table", label: "Table", icon: <TableIcon className="h-3 w-3" /> },
    { key: "timeline", label: "Timeline", icon: <Calendar className="h-3 w-3" /> },
  ];
  return (
    <div className="inline-flex rounded border border-line bg-subtle p-0.5">
      {items.map((i) => (
        <button
          key={i.key}
          onClick={() => onChange(i.key)}
          title={i.label}
          className={cn(
            "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
            value === i.key
              ? "bg-hover text-fg"
              : "text-fg-subtle hover:bg-hover hover:text-fg",
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
        className="appearance-none rounded border border-line bg-subtle py-1 pl-2 pr-6 text-[11px] text-fg focus:border-brand-500/40 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-fg-subtle" />
    </div>
  );
}

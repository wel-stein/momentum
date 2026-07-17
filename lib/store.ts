"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import type {
  Board,
  Contact,
  Group,
  Member,
  Priority,
  StatusKey,
  Task,
  ViewType,
} from "./types";
import { BOARD_EMOJIS, GROUP_COLORS } from "./constants";
import { makeSampleBoard } from "./sample";
import { pickAvatarColor } from "./utils";
import {
  deleteBoard as dbDeleteBoard,
  deleteGroup as dbDeleteGroup,
  deleteMember as dbDeleteMember,
  deleteTask as dbDeleteTask,
  fetchAllBoards,
  seedSampleBoard,
  setTaskAssignees,
  upsertBoard,
  upsertContact,
  upsertGroup,
  upsertMember,
  upsertTask,
} from "./db";
import { isSupabaseConfigured } from "./supabase";
import type { CurrentUser } from "./auth";

interface State {
  boards: Board[];
  currentUserId: string;
  currentUser: CurrentUser | null;
  hydrated: boolean;
  loading: boolean;
  syncError: string | null;
}

interface Actions {
  setHydrated: () => Promise<void>;
  setCurrentUser: (user: CurrentUser | null) => void;
  createBoard: (name: string, description?: string) => string;
  deleteBoard: (boardId: string) => void;
  renameBoard: (boardId: string, name: string) => void;
  updateBoardEmoji: (boardId: string, emoji: string) => void;
  setView: (boardId: string, view: ViewType) => void;

  addGroup: (boardId: string, name: string) => void;
  renameGroup: (boardId: string, groupId: string, name: string) => void;
  updateGroupColor: (boardId: string, groupId: string, color: string) => void;
  deleteGroup: (boardId: string, groupId: string) => void;
  toggleGroupCollapsed: (boardId: string, groupId: string) => void;

  addTask: (boardId: string, groupId: string, title: string) => void;
  updateTask: (
    boardId: string,
    taskId: string,
    patch: Partial<Omit<Task, "id" | "groupId" | "createdAt">>,
  ) => void;
  moveTask: (
    boardId: string,
    taskId: string,
    toGroupId: string,
    toStatus?: StatusKey,
  ) => void;
  deleteTask: (boardId: string, taskId: string) => void;

  /**
   * Add a person to the board's contact directory (e.g. a requester created
   * on the fly from the Requester picker). Returns the new contact's id.
   */
  addContact: (
    boardId: string,
    name: string,
    phone?: string,
    email?: string,
  ) => string | null;

  inviteMember: (boardId: string, name: string, email: string) => void;
  removeMember: (boardId: string, memberId: string) => void;
  updateMemberRole: (
    boardId: string,
    memberId: string,
    role: Member["role"],
  ) => void;

  enableSharing: (boardId: string) => string | null;
  disableSharing: (boardId: string) => void;

  /**
   * Merge a server-side change (received via Supabase Realtime) into the
   * local store. Idempotent: applying our own echo is a no-op, applying
   * a stale event is skipped via updated_at comparison.
   */
  applyRemoteChange: (change: RemoteChange) => void;
}

export interface RemoteChange {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  table:
    | "boards"
    | "board_groups"
    | "board_members"
    | "contacts"
    | "tasks"
    | "task_assignees";
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
}

function nowIso() {
  return new Date().toISOString();
}


// fire-and-forget; swallow rejections so we never crash the UI
function fnf<T>(p: Promise<T>) {
  p.catch((err) => console.error("[momentum/store] sync error", err));
}

const PLACEHOLDER_EMAIL = "you@momentum.app";

/**
 * For every board, find the member row that represents the signed-in user
 * (by auth_user_id, by id-equals-auth-uuid, or by the legacy "you@momentum.app"
 * placeholder seed) and update its name / email / avatar / authUserId to the
 * real Google profile. Returns the updated boards array plus a list of
 * upserts the caller can fire-and-forget.
 */
function claimMyMember(
  boards: Board[],
  user: CurrentUser,
): { boards: Board[]; upserts: Array<() => Promise<void>> } {
  const upserts: Array<() => Promise<void>> = [];
  const next = boards.map((b) => {
    let idx = b.members.findIndex((m) => m.authUserId === user.id);
    if (idx === -1) idx = b.members.findIndex((m) => m.id === user.id);
    if (idx === -1)
      idx = b.members.findIndex(
        (m) => m.email === PLACEHOLDER_EMAIL && m.role === "owner",
      );
    if (idx === -1) return b;
    const old = b.members[idx];
    const updated: Member = {
      ...old,
      authUserId: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl ?? old.avatarUrl ?? null,
    };
    if (
      old.authUserId === updated.authUserId &&
      old.name === updated.name &&
      old.email === updated.email &&
      old.avatarUrl === updated.avatarUrl
    )
      return b;
    const newMembers = b.members.slice();
    newMembers[idx] = updated;
    upserts.push(() => upsertMember(b.id, updated));
    return { ...b, members: newMembers, updatedAt: nowIso() };
  });
  return { boards: next, upserts };
}

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      boards: [],
      currentUserId: "",
      currentUser: null,
      hydrated: false,
      loading: false,
      syncError: null,

      setCurrentUser: (user) => {
        set({
          currentUser: user,
          currentUserId: user?.id ?? get().currentUserId,
        });
        if (!user) return;
        const { boards: nextBoards, upserts } = claimMyMember(
          get().boards,
          user,
        );
        if (upserts.length > 0) {
          set({ boards: nextBoards });
          for (const u of upserts) fnf(u());
        }
      },

      setHydrated: async () => {
        if (get().hydrated || get().loading) return;
        set({ loading: true, syncError: null });
        let currentUserId = get().currentUserId;
        if (!currentUserId) currentUserId = nanoid(10);
        const user = get().currentUser;

        if (!isSupabaseConfigured()) {
          // Local-only fallback: keep the in-memory sample if there are no boards
          let boards = get().boards;
          if (boards.length === 0)
            boards = [makeSampleBoard(currentUserId, user)];
          set({
            currentUserId,
            boards,
            hydrated: true,
            loading: false,
            syncError: "Supabase env vars missing — using local sample only.",
          });
          return;
        }

        const remote = await fetchAllBoards();
        if (!remote.ok) {
          // Most common cause: a migration hasn't been applied and the
          // SELECT references a column that doesn't exist yet. Surface the
          // raw Postgres message so the fix is obvious.
          set({
            currentUserId,
            hydrated: true,
            loading: false,
            syncError: `Supabase rejected the query: ${remote.error}`,
          });
          return;
        }
        // Only seed when signed in — RLS rejects anon writes, so seeding
        // would fail silently and leave the dashboard empty on every load.
        if (remote.data.length === 0 && user) {
          const sample = makeSampleBoard(currentUserId, user);
          set({
            currentUserId,
            boards: [sample],
            hydrated: true,
            loading: false,
          });
          fnf(seedSampleBoard(sample));
          return;
        }
        // If signed in, rewrite any "you@momentum.app" / placeholder member
        // rows to the real Google profile (legacy boards seeded pre-auth).
        let loaded = remote.data;
        if (user) {
          const sync = claimMyMember(loaded, user);
          loaded = sync.boards;
          for (const u of sync.upserts) fnf(u());
        }
        set({
          currentUserId,
          boards: loaded,
          hydrated: true,
          loading: false,
        });
      },

      createBoard: (name, description) => {
        const now = nowIso();
        const meId = get().currentUserId;
        const user = get().currentUser;
        const me: Member = user
          ? {
              id: meId,
              authUserId: user.id,
              name: user.name,
              email: user.email,
              avatarColor: pickAvatarColor(user.email),
              avatarUrl: user.avatarUrl ?? null,
              role: "owner",
            }
          : {
              id: meId,
              name: "You",
              email: "you@momentum.app",
              avatarColor: pickAvatarColor(meId),
              role: "owner",
            };
        const groups: Group[] = [
          { id: nanoid(8), name: "To do", color: GROUP_COLORS[0] },
          { id: nanoid(8), name: "Doing", color: GROUP_COLORS[2] },
          { id: nanoid(8), name: "Done", color: GROUP_COLORS[1] },
        ];
        const board: Board = {
          id: nanoid(8),
          name: name.trim() || "Untitled board",
          description,
          emoji: BOARD_EMOJIS[Math.floor(Math.random() * BOARD_EMOJIS.length)],
          view: "kanban",
          groups,
          tasks: [],
          members: [me],
          contacts: [],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ boards: [board, ...s.boards] }));
        fnf(
          (async () => {
            await upsertBoard(board);
            await upsertMember(board.id, me);
            await Promise.all(groups.map((g, i) => upsertGroup(board.id, g, i)));
          })(),
        );
        return board.id;
      },

      deleteBoard: (boardId) => {
        set((s) => ({ boards: s.boards.filter((b) => b.id !== boardId) }));
        fnf(dbDeleteBoard(boardId));
      },

      renameBoard: (boardId, name) => {
        const updated = nowIso();
        let touched: Board | undefined;
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== boardId) return b;
            touched = { ...b, name, updatedAt: updated };
            return touched;
          }),
        }));
        if (touched) fnf(upsertBoard(touched));
      },

      updateBoardEmoji: (boardId, emoji) => {
        const updated = nowIso();
        let touched: Board | undefined;
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== boardId) return b;
            touched = { ...b, emoji, updatedAt: updated };
            return touched;
          }),
        }));
        if (touched) fnf(upsertBoard(touched));
      },

      setView: (boardId, view) => {
        const updated = nowIso();
        let touched: Board | undefined;
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== boardId) return b;
            touched = { ...b, view, updatedAt: updated };
            return touched;
          }),
        }));
        if (touched) fnf(upsertBoard(touched));
      },

      addGroup: (boardId, name) => {
        const board = get().boards.find((b) => b.id === boardId);
        if (!board) return;
        const color = GROUP_COLORS[board.groups.length % GROUP_COLORS.length];
        const group: Group = {
          id: nanoid(8),
          name: name.trim() || "New group",
          color,
        };
        const position = board.groups.length;
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === boardId
              ? { ...b, groups: [...b.groups, group], updatedAt: nowIso() }
              : b,
          ),
        }));
        fnf(upsertGroup(boardId, group, position));
      },

      renameGroup: (boardId, groupId, name) => {
        let touched: Group | undefined;
        let position = 0;
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== boardId) return b;
            return {
              ...b,
              groups: b.groups.map((g, i) => {
                if (g.id !== groupId) return g;
                touched = { ...g, name };
                position = i;
                return touched;
              }),
              updatedAt: nowIso(),
            };
          }),
        }));
        if (touched) fnf(upsertGroup(boardId, touched, position));
      },

      updateGroupColor: (boardId, groupId, color) => {
        let touched: Group | undefined;
        let position = 0;
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== boardId) return b;
            return {
              ...b,
              groups: b.groups.map((g, i) => {
                if (g.id !== groupId) return g;
                touched = { ...g, color };
                position = i;
                return touched;
              }),
              updatedAt: nowIso(),
            };
          }),
        }));
        if (touched) fnf(upsertGroup(boardId, touched, position));
      },

      deleteGroup: (boardId, groupId) => {
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id !== boardId
              ? b
              : {
                  ...b,
                  groups: b.groups.filter((g) => g.id !== groupId),
                  tasks: b.tasks.filter((t) => t.groupId !== groupId),
                  updatedAt: nowIso(),
                },
          ),
        }));
        fnf(dbDeleteGroup(groupId));
      },

      toggleGroupCollapsed: (boardId, groupId) => {
        let touched: Group | undefined;
        let position = 0;
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== boardId) return b;
            return {
              ...b,
              groups: b.groups.map((g, i) => {
                if (g.id !== groupId) return g;
                touched = { ...g, collapsed: !g.collapsed };
                position = i;
                return touched;
              }),
            };
          }),
        }));
        if (touched) fnf(upsertGroup(boardId, touched, position));
      },

      addTask: (boardId, groupId, title) => {
        const now = nowIso();
        const task: Task = {
          id: nanoid(8),
          title: title.trim() || "New task",
          status: "not_started",
          priority: "medium" as Priority,
          assigneeIds: [],
          tags: [],
          groupId,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id !== boardId
              ? b
              : { ...b, tasks: [...b.tasks, task], updatedAt: now },
          ),
        }));
        fnf(upsertTask(boardId, task));
      },

      updateTask: (boardId, taskId, patch) => {
        let touched: Task | undefined;
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== boardId) return b;
            return {
              ...b,
              tasks: b.tasks.map((t) => {
                if (t.id !== taskId) return t;
                touched = { ...t, ...patch, updatedAt: nowIso() };
                return touched;
              }),
              updatedAt: nowIso(),
            };
          }),
        }));
        if (!touched) return;
        const next = touched;
        // If this patch assigns a requester, sync the contact row first so
        // the tasks.requester_id FK can't race a just-created contact
        // (contact + assignment fire back-to-back from the picker).
        const requester = patch.requesterId
          ? get()
              .boards.find((b) => b.id === boardId)
              ?.contacts.find((c) => c.id === patch.requesterId)
          : undefined;
        fnf(
          (async () => {
            if (requester) await upsertContact(boardId, requester);
            await upsertTask(boardId, next);
          })(),
        );
        // task_assignees is a separate table; only touch it when the patch
        // actually changed the assignee list, otherwise we re-DELETE+INSERT
        // on every title / status / date edit.
        if (patch.assigneeIds !== undefined) {
          fnf(setTaskAssignees(next.id, next.assigneeIds));
        }
      },

      moveTask: (boardId, taskId, toGroupId, toStatus) => {
        let touched: Task | undefined;
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== boardId) return b;
            return {
              ...b,
              tasks: b.tasks.map((t) => {
                if (t.id !== taskId) return t;
                touched = {
                  ...t,
                  groupId: toGroupId,
                  ...(toStatus ? { status: toStatus } : {}),
                  updatedAt: nowIso(),
                };
                return touched;
              }),
              updatedAt: nowIso(),
            };
          }),
        }));
        if (touched) fnf(upsertTask(boardId, touched));
      },

      deleteTask: (boardId, taskId) => {
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id !== boardId
              ? b
              : {
                  ...b,
                  tasks: b.tasks.filter((t) => t.id !== taskId),
                  updatedAt: nowIso(),
                },
          ),
        }));
        fnf(dbDeleteTask(taskId));
      },

      addContact: (boardId, name, phone, email) => {
        const board = get().boards.find((b) => b.id === boardId);
        if (!board) return null;
        const trimmedName = name.trim();
        if (!trimmedName) return null;
        const contact: Contact = {
          id: nanoid(8),
          name: trimmedName,
          phone: phone?.trim() || null,
          email: email?.trim() || null,
        };
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id !== boardId
              ? b
              : {
                  ...b,
                  contacts: [...b.contacts, contact],
                  updatedAt: nowIso(),
                },
          ),
        }));
        fnf(upsertContact(boardId, contact));
        return contact.id;
      },

      inviteMember: (boardId, name, email) => {
        const board = get().boards.find((b) => b.id === boardId);
        if (!board) return;
        if (
          board.members.some(
            (m) => m.email.toLowerCase() === email.toLowerCase(),
          )
        )
          return;
        const member: Member = {
          id: nanoid(8),
          name: name.trim() || email.split("@")[0],
          email: email.trim(),
          avatarColor: pickAvatarColor(email),
          role: "member",
        };
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id !== boardId
              ? b
              : { ...b, members: [...b.members, member], updatedAt: nowIso() },
          ),
        }));
        fnf(upsertMember(boardId, member));
      },

      removeMember: (boardId, memberId) => {
        const board = get().boards.find((b) => b.id === boardId);
        if (!board) return;
        const affectedTasks = board.tasks
          .filter((t) => t.assigneeIds.includes(memberId))
          .map((t) => ({
            ...t,
            assigneeIds: t.assigneeIds.filter((id) => id !== memberId),
          }));
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id !== boardId
              ? b
              : {
                  ...b,
                  members: b.members.filter((m) => m.id !== memberId),
                  tasks: b.tasks.map((t) =>
                    t.assigneeIds.includes(memberId)
                      ? {
                          ...t,
                          assigneeIds: t.assigneeIds.filter(
                            (id) => id !== memberId,
                          ),
                        }
                      : t,
                  ),
                  updatedAt: nowIso(),
                },
          ),
        }));
        fnf(
          (async () => {
            await dbDeleteMember(memberId);
            for (const t of affectedTasks) {
              await setTaskAssignees(t.id, t.assigneeIds);
            }
          })(),
        );
      },

      enableSharing: (boardId) => {
        const board = get().boards.find((b) => b.id === boardId);
        if (!board) return null;
        const token = board.shareToken ?? nanoid(16);
        let touched: Board | undefined;
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id !== boardId
              ? b
              : (touched = { ...b, shareToken: token, updatedAt: nowIso() }),
          ),
        }));
        if (touched) fnf(upsertBoard(touched));
        return token;
      },

      disableSharing: (boardId) => {
        let touched: Board | undefined;
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id !== boardId
              ? b
              : (touched = { ...b, shareToken: null, updatedAt: nowIso() }),
          ),
        }));
        if (touched) fnf(upsertBoard(touched));
      },

      updateMemberRole: (boardId, memberId, role) => {
        let touched: Member | undefined;
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== boardId) return b;
            return {
              ...b,
              members: b.members.map((m) => {
                if (m.id !== memberId) return m;
                touched = { ...m, role };
                return touched;
              }),
              updatedAt: nowIso(),
            };
          }),
        }));
        if (touched) fnf(upsertMember(boardId, touched));
      },

      applyRemoteChange: (c) => {
        set((s) => applyRemoteChangeReducer(s.boards, c));
      },
    }),
    {
      name: "momentum-store",
      storage: createJSONStorage(() => localStorage),
      // Only persist currentUserId. Boards live in Supabase now.
      partialize: (s) => ({ currentUserId: s.currentUserId }),
    },
  ),
);

// -----------------------------------------------------------------------------
// Realtime reducer.
//
// Translates a Supabase postgres_changes payload (INSERT / UPDATE / DELETE on
// one of our five tables) into a state slice. Pure: returns either a new
// { boards } object or the original slice (to skip the update).
// -----------------------------------------------------------------------------

function applyRemoteChangeReducer(
  boards: Board[],
  c: RemoteChange,
): Partial<State> | typeof NO_CHANGE {
  switch (c.table) {
    case "boards":
      return mergeBoardRow(boards, c);
    case "board_groups":
      return mergeGroupRow(boards, c);
    case "board_members":
      return mergeMemberRow(boards, c);
    case "contacts":
      return mergeContactRow(boards, c);
    case "tasks":
      return mergeTaskRow(boards, c);
    case "task_assignees":
      return mergeAssigneeRow(boards, c);
    default:
      return NO_CHANGE;
  }
}

const NO_CHANGE = {} as const;

function findBoardIdx(boards: Board[], id: string | undefined) {
  if (!id) return -1;
  return boards.findIndex((b) => b.id === id);
}

function mergeBoardRow(boards: Board[], c: RemoteChange) {
  const id = (c.new?.id ?? c.old?.id) as string | undefined;
  const idx = findBoardIdx(boards, id);
  if (c.eventType === "DELETE") {
    if (idx < 0) return NO_CHANGE;
    return { boards: boards.filter((_, i) => i !== idx) };
  }
  if (idx < 0 || !c.new) return NO_CHANGE; // INSERT of a board we don't own
  const row = c.new;
  const incomingUpdated = (row.updated_at as string) ?? "";
  if (incomingUpdated && incomingUpdated < boards[idx].updatedAt) {
    return NO_CHANGE;
  }
  const updated: Board = {
    ...boards[idx],
    name: (row.name as string) ?? boards[idx].name,
    description: (row.description as string | null) ?? undefined,
    emoji: ((row.emoji as string) ?? boards[idx].emoji) || "📋",
    view: ((row.view as Board["view"]) ?? boards[idx].view) || "kanban",
    shareToken: (row.share_token as string | null) ?? null,
    updatedAt: incomingUpdated || boards[idx].updatedAt,
  };
  const next = boards.slice();
  next[idx] = updated;
  return { boards: next };
}

function mergeGroupRow(boards: Board[], c: RemoteChange) {
  const boardId = (c.new?.board_id ?? c.old?.board_id) as string | undefined;
  const idx = findBoardIdx(boards, boardId);
  if (idx < 0) return NO_CHANGE;
  const board = { ...boards[idx], groups: boards[idx].groups.slice() };
  if (c.eventType === "DELETE") {
    const gid = c.old?.id as string | undefined;
    if (!gid) return NO_CHANGE;
    board.groups = board.groups.filter((g) => g.id !== gid);
    board.tasks = board.tasks.filter((t) => t.groupId !== gid);
  } else if (c.new) {
    const r = c.new;
    const g: Group = {
      id: r.id as string,
      name: r.name as string,
      color: r.color as string,
      collapsed: (r.collapsed as boolean) ?? false,
    };
    const gi = board.groups.findIndex((x) => x.id === g.id);
    if (gi >= 0) board.groups[gi] = g;
    else board.groups.push(g);
  } else {
    return NO_CHANGE;
  }
  const next = boards.slice();
  next[idx] = board;
  return { boards: next };
}

function mergeMemberRow(boards: Board[], c: RemoteChange) {
  const boardId = (c.new?.board_id ?? c.old?.board_id) as string | undefined;
  const idx = findBoardIdx(boards, boardId);
  if (idx < 0) return NO_CHANGE;
  const board = { ...boards[idx], members: boards[idx].members.slice() };
  if (c.eventType === "DELETE") {
    const mid = c.old?.id as string | undefined;
    if (!mid) return NO_CHANGE;
    board.members = board.members.filter((m) => m.id !== mid);
    board.tasks = board.tasks.map((t) =>
      t.assigneeIds.includes(mid)
        ? { ...t, assigneeIds: t.assigneeIds.filter((id) => id !== mid) }
        : t,
    );
  } else if (c.new) {
    const r = c.new;
    const m: Member = {
      id: r.id as string,
      name: r.name as string,
      email: r.email as string,
      avatarColor: (r.avatar_color as string) ?? "#3a5dff",
      avatarUrl: (r.avatar_url as string | null) ?? null,
      authUserId: (r.auth_user_id as string | null) ?? null,
      role: ((r.role as Member["role"]) ?? "member") as Member["role"],
    };
    const mi = board.members.findIndex((x) => x.id === m.id);
    if (mi >= 0) board.members[mi] = m;
    else board.members.push(m);
  } else {
    return NO_CHANGE;
  }
  const next = boards.slice();
  next[idx] = board;
  return { boards: next };
}

function mergeContactRow(boards: Board[], c: RemoteChange) {
  const boardId = (c.new?.board_id ?? c.old?.board_id) as string | undefined;
  const idx = findBoardIdx(boards, boardId);
  if (idx < 0) return NO_CHANGE;
  const board = { ...boards[idx], contacts: boards[idx].contacts.slice() };
  if (c.eventType === "DELETE") {
    const cid = c.old?.id as string | undefined;
    if (!cid) return NO_CHANGE;
    board.contacts = board.contacts.filter((x) => x.id !== cid);
    board.tasks = board.tasks.map((t) =>
      t.requesterId === cid ? { ...t, requesterId: null } : t,
    );
  } else if (c.new) {
    const r = c.new;
    const contact: Contact = {
      id: r.id as string,
      name: r.name as string,
      phone: (r.phone as string | null) ?? null,
      email: (r.email as string | null) ?? null,
    };
    const ci = board.contacts.findIndex((x) => x.id === contact.id);
    if (ci >= 0) board.contacts[ci] = contact;
    else board.contacts.push(contact);
  } else {
    return NO_CHANGE;
  }
  const next = boards.slice();
  next[idx] = board;
  return { boards: next };
}

function mergeTaskRow(boards: Board[], c: RemoteChange) {
  const boardId = (c.new?.board_id ?? c.old?.board_id) as string | undefined;
  const idx = findBoardIdx(boards, boardId);
  if (idx < 0) return NO_CHANGE;
  const board = { ...boards[idx], tasks: boards[idx].tasks.slice() };
  if (c.eventType === "DELETE") {
    const tid = c.old?.id as string | undefined;
    if (!tid) return NO_CHANGE;
    board.tasks = board.tasks.filter((t) => t.id !== tid);
  } else if (c.new) {
    const r = c.new;
    const existingIdx = board.tasks.findIndex((t) => t.id === r.id);
    const incomingUpdated = (r.updated_at as string) ?? "";
    if (
      existingIdx >= 0 &&
      incomingUpdated &&
      incomingUpdated < board.tasks[existingIdx].updatedAt
    ) {
      return NO_CHANGE; // stale echo / older write
    }
    const merged: Task = {
      id: r.id as string,
      title: (r.title as string) ?? "",
      description: (r.description as string | null) ?? undefined,
      status: (r.status as Task["status"]) ?? "not_started",
      priority: (r.priority as Task["priority"]) ?? "medium",
      // task_assignees has its own subscription; preserve current value.
      assigneeIds:
        existingIdx >= 0 ? board.tasks[existingIdx].assigneeIds : [],
      requesterId: (r.requester_id as string | null) ?? null,
      startDate: (r.start_date as string | null) ?? undefined,
      dueDate: (r.due_date as string | null) ?? undefined,
      tags: (r.tags as string[] | null) ?? [],
      groupId: r.group_id as string,
      createdAt: (r.created_at as string) ?? new Date().toISOString(),
      updatedAt: incomingUpdated || new Date().toISOString(),
    };
    if (existingIdx >= 0) board.tasks[existingIdx] = merged;
    else board.tasks.push(merged);
  } else {
    return NO_CHANGE;
  }
  const next = boards.slice();
  next[idx] = board;
  return { boards: next };
}

function mergeAssigneeRow(boards: Board[], c: RemoteChange) {
  const taskId = (c.new?.task_id ?? c.old?.task_id) as string | undefined;
  const memberId = (c.new?.member_id ?? c.old?.member_id) as
    | string
    | undefined;
  if (!taskId || !memberId) return NO_CHANGE;
  let bi = -1;
  let ti = -1;
  for (let i = 0; i < boards.length; i++) {
    const idx = boards[i].tasks.findIndex((t) => t.id === taskId);
    if (idx >= 0) {
      bi = i;
      ti = idx;
      break;
    }
  }
  if (bi < 0) return NO_CHANGE;
  const board = { ...boards[bi], tasks: boards[bi].tasks.slice() };
  const task = { ...board.tasks[ti] };
  if (c.eventType === "DELETE") {
    task.assigneeIds = task.assigneeIds.filter((id) => id !== memberId);
  } else if (c.eventType === "INSERT") {
    if (!task.assigneeIds.includes(memberId)) {
      task.assigneeIds = [...task.assigneeIds, memberId];
    }
  } else {
    return NO_CHANGE;
  }
  board.tasks[ti] = task;
  const next = boards.slice();
  next[bi] = board;
  return { boards: next };
}

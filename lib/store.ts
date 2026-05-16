"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import {
  Board,
  Group,
  GROUP_COLORS,
  Member,
  Priority,
  StatusKey,
  Task,
  ViewType,
  BOARD_EMOJIS,
} from "./types";
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

  inviteMember: (boardId: string, name: string, email: string) => void;
  removeMember: (boardId: string, memberId: string) => void;
  updateMemberRole: (
    boardId: string,
    memberId: string,
    role: Member["role"],
  ) => void;

  enableSharing: (boardId: string) => string | null;
  disableSharing: (boardId: string) => void;
}

function nowIso() {
  return new Date().toISOString();
}

function makeSampleBoard(
  currentUserId: string,
  currentUser: CurrentUser | null,
): Board {
  const now = nowIso();
  const inDays = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString();
  };
  const groupA: Group = {
    id: nanoid(8),
    name: "This week",
    color: GROUP_COLORS[0],
  };
  const groupB: Group = {
    id: nanoid(8),
    name: "Next week",
    color: GROUP_COLORS[1],
  };
  const groupC: Group = {
    id: nanoid(8),
    name: "Backlog",
    color: GROUP_COLORS[3],
  };

  const me: Member = currentUser
    ? {
        id: currentUserId,
        authUserId: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        avatarColor: pickAvatarColor(currentUser.email),
        avatarUrl: currentUser.avatarUrl ?? null,
        role: "owner",
      }
    : {
        id: currentUserId,
        name: "You",
        email: "you@momentum.app",
        avatarColor: pickAvatarColor(currentUserId),
        role: "owner",
      };
  const alex: Member = {
    id: nanoid(8),
    name: "Alex Rivera",
    email: "alex@momentum.app",
    avatarColor: pickAvatarColor("alex"),
    role: "admin",
  };
  const sam: Member = {
    id: nanoid(8),
    name: "Sam Chen",
    email: "sam@momentum.app",
    avatarColor: pickAvatarColor("sam"),
    role: "member",
  };

  const tasks: Task[] = [
    {
      id: nanoid(8),
      title: "Design landing page hero",
      description: "Mockup three options and review with the team.",
      status: "in_progress",
      priority: "high",
      assigneeIds: [alex.id],
      startDate: inDays(-1),
      dueDate: inDays(2),
      tags: ["design", "marketing"],
      groupId: groupA.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(8),
      title: "Set up CI pipeline",
      status: "review",
      priority: "medium",
      assigneeIds: [me.id, sam.id],
      startDate: inDays(0),
      dueDate: inDays(3),
      tags: ["infra"],
      groupId: groupA.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(8),
      title: "Write onboarding emails",
      status: "not_started",
      priority: "low",
      assigneeIds: [sam.id],
      startDate: inDays(4),
      dueDate: inDays(8),
      tags: ["growth"],
      groupId: groupB.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(8),
      title: "Investigate Sentry alerts",
      status: "stuck",
      priority: "critical",
      assigneeIds: [me.id],
      startDate: inDays(-2),
      dueDate: inDays(1),
      tags: ["bug"],
      groupId: groupA.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(8),
      title: "Q3 roadmap workshop",
      status: "not_started",
      priority: "medium",
      assigneeIds: [me.id, alex.id, sam.id],
      startDate: inDays(10),
      dueDate: inDays(11),
      tags: ["planning"],
      groupId: groupB.id,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: nanoid(8),
      title: "Mobile responsive audit",
      status: "done",
      priority: "low",
      assigneeIds: [alex.id],
      tags: ["design"],
      groupId: groupC.id,
      createdAt: now,
      updatedAt: now,
    },
  ];

  return {
    id: nanoid(8),
    name: "Product launch",
    description: "Cross-functional plan for the v1 launch.",
    emoji: "🚀",
    view: "kanban",
    groups: [groupA, groupB, groupC],
    tasks,
    members: [me, alex, sam],
    createdAt: now,
    updatedAt: now,
  };
}

// fire-and-forget; swallow rejections so we never crash the UI
function fnf<T>(p: Promise<T>) {
  p.catch((err) => console.error("[momentum/store] sync error", err));
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
        set({
          currentUserId,
          boards: remote.data,
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
        if (touched) {
          const t = touched;
          if (patch.assigneeIds) {
            fnf(
              (async () => {
                await upsertTask(boardId, t);
              })(),
            );
          } else {
            fnf(upsertTask(boardId, t));
          }
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
    }),
    {
      name: "momentum-store",
      storage: createJSONStorage(() => localStorage),
      // Only persist currentUserId. Boards live in Supabase now.
      partialize: (s) => ({ currentUserId: s.currentUserId }),
    },
  ),
);

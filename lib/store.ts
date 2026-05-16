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

interface State {
  boards: Board[];
  currentUserId: string;
  hydrated: boolean;
}

interface Actions {
  setHydrated: () => void;
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
}

function nowIso() {
  return new Date().toISOString();
}

function makeSampleBoard(currentUserId: string): Board {
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

  const me: Member = {
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

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      boards: [],
      currentUserId: "",
      hydrated: false,

      setHydrated: () => {
        if (get().hydrated) return;
        let { currentUserId, boards } = get();
        if (!currentUserId) currentUserId = nanoid(10);
        if (boards.length === 0) {
          boards = [makeSampleBoard(currentUserId)];
        }
        set({ currentUserId, boards, hydrated: true });
      },

      createBoard: (name, description) => {
        const now = nowIso();
        const me = get().currentUserId;
        const board: Board = {
          id: nanoid(8),
          name: name.trim() || "Untitled board",
          description,
          emoji: BOARD_EMOJIS[Math.floor(Math.random() * BOARD_EMOJIS.length)],
          view: "kanban",
          groups: [
            { id: nanoid(8), name: "To do", color: GROUP_COLORS[0] },
            { id: nanoid(8), name: "Doing", color: GROUP_COLORS[2] },
            { id: nanoid(8), name: "Done", color: GROUP_COLORS[1] },
          ],
          tasks: [],
          members: [
            {
              id: me,
              name: "You",
              email: "you@momentum.app",
              avatarColor: pickAvatarColor(me),
              role: "owner",
            },
          ],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ boards: [board, ...s.boards] }));
        return board.id;
      },

      deleteBoard: (boardId) =>
        set((s) => ({ boards: s.boards.filter((b) => b.id !== boardId) })),

      renameBoard: (boardId, name) =>
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === boardId ? { ...b, name, updatedAt: nowIso() } : b,
          ),
        })),

      updateBoardEmoji: (boardId, emoji) =>
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === boardId ? { ...b, emoji, updatedAt: nowIso() } : b,
          ),
        })),

      setView: (boardId, view) =>
        set((s) => ({
          boards: s.boards.map((b) =>
            b.id === boardId ? { ...b, view, updatedAt: nowIso() } : b,
          ),
        })),

      addGroup: (boardId, name) =>
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== boardId) return b;
            const color = GROUP_COLORS[b.groups.length % GROUP_COLORS.length];
            return {
              ...b,
              groups: [
                ...b.groups,
                { id: nanoid(8), name: name.trim() || "New group", color },
              ],
              updatedAt: nowIso(),
            };
          }),
        })),

      renameGroup: (boardId, groupId, name) =>
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== boardId) return b;
            return {
              ...b,
              groups: b.groups.map((g) =>
                g.id === groupId ? { ...g, name } : g,
              ),
              updatedAt: nowIso(),
            };
          }),
        })),

      updateGroupColor: (boardId, groupId, color) =>
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== boardId) return b;
            return {
              ...b,
              groups: b.groups.map((g) =>
                g.id === groupId ? { ...g, color } : g,
              ),
              updatedAt: nowIso(),
            };
          }),
        })),

      deleteGroup: (boardId, groupId) =>
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== boardId) return b;
            return {
              ...b,
              groups: b.groups.filter((g) => g.id !== groupId),
              tasks: b.tasks.filter((t) => t.groupId !== groupId),
              updatedAt: nowIso(),
            };
          }),
        })),

      toggleGroupCollapsed: (boardId, groupId) =>
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== boardId) return b;
            return {
              ...b,
              groups: b.groups.map((g) =>
                g.id === groupId ? { ...g, collapsed: !g.collapsed } : g,
              ),
            };
          }),
        })),

      addTask: (boardId, groupId, title) =>
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== boardId) return b;
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
            return { ...b, tasks: [...b.tasks, task], updatedAt: now };
          }),
        })),

      updateTask: (boardId, taskId, patch) =>
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== boardId) return b;
            return {
              ...b,
              tasks: b.tasks.map((t) =>
                t.id === taskId
                  ? { ...t, ...patch, updatedAt: nowIso() }
                  : t,
              ),
              updatedAt: nowIso(),
            };
          }),
        })),

      moveTask: (boardId, taskId, toGroupId, toStatus) =>
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== boardId) return b;
            return {
              ...b,
              tasks: b.tasks.map((t) =>
                t.id === taskId
                  ? {
                      ...t,
                      groupId: toGroupId,
                      ...(toStatus ? { status: toStatus } : {}),
                      updatedAt: nowIso(),
                    }
                  : t,
              ),
              updatedAt: nowIso(),
            };
          }),
        })),

      deleteTask: (boardId, taskId) =>
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== boardId) return b;
            return {
              ...b,
              tasks: b.tasks.filter((t) => t.id !== taskId),
              updatedAt: nowIso(),
            };
          }),
        })),

      inviteMember: (boardId, name, email) =>
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== boardId) return b;
            if (b.members.some((m) => m.email.toLowerCase() === email.toLowerCase()))
              return b;
            const member: Member = {
              id: nanoid(8),
              name: name.trim() || email.split("@")[0],
              email: email.trim(),
              avatarColor: pickAvatarColor(email),
              role: "member",
            };
            return {
              ...b,
              members: [...b.members, member],
              updatedAt: nowIso(),
            };
          }),
        })),

      removeMember: (boardId, memberId) =>
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== boardId) return b;
            return {
              ...b,
              members: b.members.filter((m) => m.id !== memberId),
              tasks: b.tasks.map((t) => ({
                ...t,
                assigneeIds: t.assigneeIds.filter((id) => id !== memberId),
              })),
              updatedAt: nowIso(),
            };
          }),
        })),

      updateMemberRole: (boardId, memberId, role) =>
        set((s) => ({
          boards: s.boards.map((b) => {
            if (b.id !== boardId) return b;
            return {
              ...b,
              members: b.members.map((m) =>
                m.id === memberId ? { ...m, role } : m,
              ),
              updatedAt: nowIso(),
            };
          }),
        })),
    }),
    {
      name: "momentum-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ boards: s.boards, currentUserId: s.currentUserId }),
    },
  ),
);

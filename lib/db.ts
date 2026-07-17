"use client";

import type { Board, Contact, Group, Member, Task } from "./types";
import { getSupabase } from "./supabase";

interface BoardRow {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  view: string;
  share_token: string | null;
  created_at: string;
  updated_at: string;
}
interface GroupRow {
  id: string;
  board_id: string;
  name: string;
  color: string;
  collapsed: boolean;
  position: number;
}
interface MemberRow {
  id: string;
  board_id: string;
  name: string;
  email: string;
  avatar_color: string | null;
  avatar_url: string | null;
  auth_user_id: string | null;
  role: string;
}
interface TaskRow {
  id: string;
  board_id: string;
  group_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  requester_id: string | null;
  start_date: string | null;
  due_date: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  task_assignees?: { member_id: string }[];
}
interface ContactRow {
  id: string;
  board_id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

function logErr(label: string, err: unknown) {
  if (err) console.error(`[momentum/db] ${label}`, err);
}

export type FetchResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function fetchAllBoards(): Promise<FetchResult<Board[]>> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase client is not configured." };
  const { data, error } = await sb
    .from("boards")
    .select(
      `id, name, description, emoji, view, share_token, created_at, updated_at,
       board_groups (id, board_id, name, color, collapsed, position),
       board_members (id, board_id, name, email, avatar_color, avatar_url, auth_user_id, role),
       contacts (id, board_id, name, phone, email),
       tasks (id, board_id, group_id, title, description, status, priority,
              requester_id, start_date, due_date, tags, created_at, updated_at,
              task_assignees (member_id))`,
    )
    .order("updated_at", { ascending: false });
  if (error) {
    logErr("fetchAllBoards", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data ?? []).map(rowToBoard) };
}

function rowToBoard(b: BoardRow & {
  board_groups: GroupRow[];
  board_members: MemberRow[];
  contacts: ContactRow[];
  tasks: TaskRow[];
}): Board {
  const groups: Group[] = (b.board_groups ?? [])
    .slice()
    .sort((a, c) => a.position - c.position)
    .map((g) => ({
      id: g.id,
      name: g.name,
      color: g.color,
      collapsed: g.collapsed,
    }));
  const members: Member[] = (b.board_members ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    avatarColor: m.avatar_color ?? "#3a5dff",
    avatarUrl: m.avatar_url ?? null,
    authUserId: m.auth_user_id ?? null,
    role: (m.role as Member["role"]) ?? "member",
  }));
  const contacts: Contact[] = (b.contacts ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone ?? null,
    email: c.email ?? null,
  }));
  const tasks: Task[] = (b.tasks ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description ?? undefined,
    status: t.status as Task["status"],
    priority: t.priority as Task["priority"],
    assigneeIds: (t.task_assignees ?? []).map((a) => a.member_id),
    requesterId: t.requester_id ?? null,
    startDate: t.start_date ?? undefined,
    dueDate: t.due_date ?? undefined,
    tags: t.tags ?? [],
    groupId: t.group_id,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  }));
  return {
    id: b.id,
    name: b.name,
    description: b.description ?? undefined,
    emoji: b.emoji ?? "📋",
    view: b.view as Board["view"],
    groups,
    tasks,
    members,
    contacts,
    shareToken: b.share_token ?? null,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
  };
}

export async function fetchBoardByToken(
  token: string,
): Promise<Board | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("boards")
    .select(
      `id, name, description, emoji, view, share_token, created_at, updated_at,
       board_groups (id, board_id, name, color, collapsed, position),
       board_members (id, board_id, name, email, avatar_color, avatar_url, auth_user_id, role),
       contacts (id, board_id, name, phone, email),
       tasks (id, board_id, group_id, title, description, status, priority,
              requester_id, start_date, due_date, tags, created_at, updated_at,
              task_assignees (member_id))`,
    )
    .eq("share_token", token)
    .maybeSingle();
  if (error) {
    logErr("fetchBoardByToken", error);
    return null;
  }
  if (!data) return null;
  return rowToBoard(
    data as BoardRow & {
      board_groups: GroupRow[];
      board_members: MemberRow[];
      contacts: ContactRow[];
      tasks: TaskRow[];
    },
  );
}

export async function upsertBoard(board: Board) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("boards").upsert({
    id: board.id,
    name: board.name,
    description: board.description ?? null,
    emoji: board.emoji,
    view: board.view,
    share_token: board.shareToken ?? null,
    created_at: board.createdAt,
    updated_at: board.updatedAt,
  });
  logErr("upsertBoard", error);
}

export async function deleteBoard(boardId: string) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("boards").delete().eq("id", boardId);
  logErr("deleteBoard", error);
}

export async function upsertGroup(boardId: string, group: Group, position = 0) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("board_groups").upsert({
    id: group.id,
    board_id: boardId,
    name: group.name,
    color: group.color,
    collapsed: group.collapsed ?? false,
    position,
  });
  logErr("upsertGroup", error);
}

export async function deleteGroup(groupId: string) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("board_groups").delete().eq("id", groupId);
  logErr("deleteGroup", error);
}

export async function upsertMember(boardId: string, member: Member) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("board_members").upsert({
    id: member.id,
    board_id: boardId,
    name: member.name,
    email: member.email,
    avatar_color: member.avatarColor,
    avatar_url: member.avatarUrl ?? null,
    auth_user_id: member.authUserId ?? null,
    role: member.role,
  });
  logErr("upsertMember", error);
}

export async function deleteMember(memberId: string) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("board_members").delete().eq("id", memberId);
  logErr("deleteMember", error);
}

export async function upsertContact(boardId: string, contact: Contact) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("contacts").upsert({
    id: contact.id,
    board_id: boardId,
    name: contact.name,
    phone: contact.phone ?? null,
    email: contact.email ?? null,
    updated_at: new Date().toISOString(),
  });
  logErr("upsertContact", error);
}

export async function upsertTask(boardId: string, task: Task) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("tasks").upsert({
    id: task.id,
    board_id: boardId,
    group_id: task.groupId,
    title: task.title,
    description: task.description ?? null,
    status: task.status,
    priority: task.priority,
    requester_id: task.requesterId ?? null,
    start_date: task.startDate ?? null,
    due_date: task.dueDate ?? null,
    tags: task.tags,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  });
  logErr("upsertTask", error);
}

export async function setTaskAssignees(taskId: string, memberIds: string[]) {
  const sb = getSupabase();
  if (!sb) return;
  const { error: delErr } = await sb
    .from("task_assignees")
    .delete()
    .eq("task_id", taskId);
  logErr("clearAssignees", delErr);
  if (memberIds.length === 0) return;
  const { error } = await sb
    .from("task_assignees")
    .insert(memberIds.map((mid) => ({ task_id: taskId, member_id: mid })));
  logErr("setAssignees", error);
}

export async function deleteTask(taskId: string) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("tasks").delete().eq("id", taskId);
  logErr("deleteTask", error);
}

export async function seedSampleBoard(board: Board) {
  await upsertBoard(board);
  // Members must be inserted before groups/tasks: per-board RLS requires
  // is_board_member(board_id) for sub-table writes. Within the members
  // list the owner (the row carrying auth_user_id = auth.uid()) must
  // come first so subsequent inserts of teammate rows satisfy the
  // membership check.
  for (const m of board.members) await upsertMember(board.id, m);
  await Promise.all(
    board.groups.map((g, i) => upsertGroup(board.id, g, i)),
  );
  // Contacts must exist before tasks so requester_id FKs resolve.
  await Promise.all(board.contacts.map((c) => upsertContact(board.id, c)));
  for (const t of board.tasks) {
    await upsertTask(board.id, t);
    if (t.assigneeIds.length > 0) await setTaskAssignees(t.id, t.assigneeIds);
  }
}

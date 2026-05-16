// Value constants previously co-located here live in lib/constants.ts.
// Re-exported below so existing imports keep working.

export type ViewType = "kanban" | "table" | "timeline";

export type Priority = "low" | "medium" | "high" | "critical";

export type StatusKey =
  | "not_started"
  | "in_progress"
  | "stuck"
  | "done"
  | "review";

export interface Status {
  key: StatusKey;
  label: string;
  color: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  avatarUrl?: string | null;
  authUserId?: string | null;
  role: "owner" | "admin" | "member" | "viewer";
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: StatusKey;
  priority: Priority;
  assigneeIds: string[];
  startDate?: string; // ISO
  dueDate?: string; // ISO
  tags: string[];
  groupId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  color: string;
  collapsed?: boolean;
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  emoji: string;
  view: ViewType;
  groups: Group[];
  tasks: Task[];
  members: Member[];
  shareToken?: string | null;
  createdAt: string;
  updatedAt: string;
}

export {
  AVATAR_COLORS,
  BOARD_EMOJIS,
  GROUP_COLORS,
  PRIORITY_META,
  STATUSES,
} from "./constants";

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

export const STATUSES: Status[] = [
  { key: "not_started", label: "Not started", color: "#c4c4c4" },
  { key: "in_progress", label: "Working on it", color: "#fdab3d" },
  { key: "stuck", label: "Stuck", color: "#e2445c" },
  { key: "review", label: "In review", color: "#a25ddc" },
  { key: "done", label: "Done", color: "#00c875" },
];

export const PRIORITY_META: Record<Priority, { label: string; color: string }> =
  {
    low: { label: "Low", color: "#9aadbd" },
    medium: { label: "Medium", color: "#5559df" },
    high: { label: "High", color: "#ff642e" },
    critical: { label: "Critical", color: "#bb3354" },
  };

export interface Member {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
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
  createdAt: string;
  updatedAt: string;
}

export const GROUP_COLORS = [
  "#3a5dff",
  "#00c875",
  "#fdab3d",
  "#e2445c",
  "#a25ddc",
  "#0086c0",
  "#ff7575",
  "#7f5347",
];

export const AVATAR_COLORS = [
  "#3a5dff",
  "#00c875",
  "#fdab3d",
  "#e2445c",
  "#a25ddc",
  "#0086c0",
  "#ff7575",
  "#7f5347",
  "#bb3354",
  "#1f2a8b",
];

export const BOARD_EMOJIS = [
  "🚀",
  "🎯",
  "📊",
  "💡",
  "🏗️",
  "🎨",
  "📝",
  "🧪",
  "📦",
  "🔥",
  "⚡",
  "🌟",
];

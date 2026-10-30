// Value constants previously co-located here live in lib/constants.ts.
// Re-exported below so existing imports keep working.

export type ViewType = "kanban" | "table" | "timeline";

export type Priority = "low" | "medium" | "high" | "critical";

export type StatusKey =
  | "not_started"
  | "in_progress"
  | "stuck"
  | "kiv"
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

/**
 * A person in the board's contact directory. Unlike a Member, a contact
 * never signs in — it's an external requester reachable by phone/email.
 */
export interface Contact {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

/**
 * One stretch of work on a task. `endedAt === null` means the stopwatch is
 * still running — the timer lives in the database rather than in the tab,
 * so a refresh (or a different device) picks it up where it left off.
 */
export interface TimeEntry {
  id: string;
  taskId: string;
  /** Board member who logged it; null if they have since been removed. */
  memberId?: string | null;
  startedAt: string; // ISO
  endedAt?: string | null; // ISO, null while running
  /** "timer" = started/stopped here, "manual" = a duration typed in. */
  source: "timer" | "manual";
  note?: string | null;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: StatusKey;
  priority: Priority;
  assigneeIds: string[];
  requesterId?: string | null;
  startDate?: string; // ISO
  dueDate?: string; // ISO
  tags: string[];
  groupId: string;
  /** Every logged stretch of work; the task's duration is their sum. */
  timeEntries: TimeEntry[];
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
  contacts: Contact[];
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

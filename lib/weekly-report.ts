/**
 * How a weekly report is assembled from a board.
 *
 * This used to live inside WeeklyReportModal, which was fine while a person
 * pressed the button. The scheduled send builds the same report on the
 * server, and two copies of these rules would drift — the emailed report
 * would stop matching the preview. So the rules live here, in one pure
 * module both paths import.
 *
 * Deliberately structural: it asks for the least it needs rather than a
 * full Board, so the cron can assemble the shape straight from database
 * rows without pulling in the browser-side store.
 */

// Explicit .ts extensions: this module is exercised by node --test, whose
// ESM resolver does not guess them the way the bundler does.
import { STATUSES } from "./constants.ts";
import type { WeeklyReportTask } from "./mailer.ts";

/** Group names the report reads from, matched case-insensitively. */
export const REPORT_GROUP_KEYS = {
  thisWeek: "this week",
  nextWeek: "next week",
  backlog: "backlog",
} as const;

export interface ReportTask {
  id: string;
  title: string;
  status: string;
  groupId: string;
  assigneeIds: string[];
  requesterId?: string | null;
}

export interface ReportBoard {
  name: string;
  emoji?: string;
  groups: { id: string; name: string }[];
  tasks: ReportTask[];
  members: { id: string; name: string }[];
  contacts: { id: string; name: string }[];
}

export interface ReportSection<T extends ReportTask = ReportTask> {
  label: string;
  groupKey: string;
  accent: string;
  tasks: T[];
}

export function statusLabel(statusKey: string): string {
  return STATUSES.find((s) => s.key === statusKey)?.label ?? statusKey;
}

function matchGroup(name: string, key: string): boolean {
  return name.trim().toLowerCase() === key;
}

export function memberName(board: ReportBoard, id: string): string {
  return board.members.find((m) => m.id === id)?.name ?? id;
}

export function requesterName(
  board: ReportBoard,
  task: ReportTask,
): string | null {
  if (!task.requesterId) return null;
  return board.contacts.find((c) => c.id === task.requesterId)?.name ?? null;
}

/**
 * The report's three sections, in order, each holding the tasks of the
 * group whose name matches. A missing group yields an empty section rather
 * than being dropped, so the report's shape is stable week to week.
 */
export function buildReportSections<T extends ReportTask>(board: {
  groups: { id: string; name: string }[];
  tasks: T[];
}): ReportSection<T>[] {
  const tasksByGroup = new Map<string, T[]>();
  for (const task of board.tasks) {
    const arr = tasksByGroup.get(task.groupId) ?? [];
    arr.push(task);
    tasksByGroup.set(task.groupId, arr);
  }
  const tasksFor = (key: string): T[] => {
    for (const group of board.groups) {
      if (matchGroup(group.name, key)) return tasksByGroup.get(group.id) ?? [];
    }
    return [];
  };
  return [
    {
      label: "Completed this week",
      groupKey: REPORT_GROUP_KEYS.thisWeek,
      accent: "#00c875",
      tasks: tasksFor(REPORT_GROUP_KEYS.thisWeek),
    },
    {
      label: "Planned for next week",
      groupKey: REPORT_GROUP_KEYS.nextWeek,
      accent: "#fdab3d",
      tasks: tasksFor(REPORT_GROUP_KEYS.nextWeek),
    },
    {
      label: "In the pipeline",
      groupKey: REPORT_GROUP_KEYS.backlog,
      accent: "#7c3aed",
      tasks: tasksFor(REPORT_GROUP_KEYS.backlog),
    },
  ];
}

/** Turn a section's tasks into the rows the email template renders. */
export function toMailTasks(
  board: ReportBoard,
  tasks: ReportTask[],
): WeeklyReportTask[] {
  return tasks.map((t) => ({
    title: t.title,
    status: statusLabel(t.status),
    assignees: t.assigneeIds.map((id) => memberName(board, id)),
    requester: requesterName(board, t),
  }));
}

/**
 * Every task id the report covers — what gets stamped as reported once the
 * email actually goes out.
 */
export function reportedTaskIds(sections: ReportSection[]): string[] {
  return sections.flatMap((s) => s.tasks.map((t) => t.id));
}

/** True when there is nothing worth mailing. */
export function isEmptyReport(sections: ReportSection[]): boolean {
  return sections.every((s) => s.tasks.length === 0);
}

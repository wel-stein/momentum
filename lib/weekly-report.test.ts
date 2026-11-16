/**
 * Cover for the report rules now that two callers depend on them: the
 * dialog's preview and the scheduled send. If these drift, management
 * receives something different from what the person saw.
 *
 *   npm run test
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildReportSections,
  isEmptyReport,
  memberName,
  reportedTaskIds,
  requesterName,
  statusLabel,
  toMailTasks,
  type ReportBoard,
  type ReportTask,
} from "./weekly-report.ts";

function task(p: Partial<ReportTask> & { id: string; groupId: string }): ReportTask {
  return {
    title: `Task ${p.id}`,
    status: "done",
    assigneeIds: [],
    requesterId: null,
    ...p,
  };
}

const BOARD: ReportBoard = {
  name: "Handal Indah",
  emoji: "🚍",
  groups: [
    { id: "g1", name: "This Week" },
    { id: "g2", name: "  next week  " }, // stray case and padding
    { id: "g3", name: "Backlog" },
    { id: "g4", name: "Someday" }, // not part of the report
  ],
  members: [
    { id: "m1", name: "Handy" },
    { id: "m2", name: "Su Yin" },
  ],
  contacts: [{ id: "c1", name: "Jordan Lee" }],
  tasks: [
    task({ id: "t1", groupId: "g1", status: "in_progress", assigneeIds: ["m1", "m2"] }),
    task({ id: "t2", groupId: "g1", requesterId: "c1" }),
    task({ id: "t3", groupId: "g2", status: "not_started" }),
    task({ id: "t4", groupId: "g3", status: "stuck" }),
    task({ id: "t5", groupId: "g4" }), // outside the three groups
  ],
};

test("the report always has its three sections, in order", () => {
  const s = buildReportSections(BOARD);
  assert.equal(s.length, 3);
  assert.deepEqual(s.map((x) => x.groupKey), [
    "this week",
    "next week",
    "backlog",
  ]);
});

test("group names match case-insensitively and ignore padding", () => {
  const s = buildReportSections(BOARD);
  assert.deepEqual(s[0].tasks.map((t) => t.id), ["t1", "t2"], "This Week");
  assert.deepEqual(s[1].tasks.map((t) => t.id), ["t3"], "'  next week  '");
  assert.deepEqual(s[2].tasks.map((t) => t.id), ["t4"], "Backlog");
});

test("tasks outside the three groups are never reported", () => {
  const ids = reportedTaskIds(buildReportSections(BOARD));
  assert.ok(!ids.includes("t5"), "a Someday task must not be reported");
  assert.deepEqual(ids, ["t1", "t2", "t3", "t4"]);
});

test("a missing group yields an empty section rather than vanishing", () => {
  const s = buildReportSections({
    groups: [{ id: "g1", name: "This Week" }],
    tasks: [task({ id: "t1", groupId: "g1" })],
  });
  assert.equal(s.length, 3);
  assert.deepEqual(s[1].tasks, []);
  assert.deepEqual(s[2].tasks, []);
});

test("an all-empty report is recognised, so nothing pointless is mailed", () => {
  assert.equal(isEmptyReport(buildReportSections(BOARD)), false);
  assert.equal(
    isEmptyReport(buildReportSections({ groups: [], tasks: [] })),
    true,
  );
  assert.equal(
    isEmptyReport(
      buildReportSections({
        groups: [{ id: "g1", name: "This Week" }],
        tasks: [],
      }),
    ),
    true,
  );
});

test("mail rows carry names, not ids", () => {
  const s = buildReportSections(BOARD);
  const rows = toMailTasks(BOARD, s[0].tasks);
  assert.deepEqual(rows[0].assignees, ["Handy", "Su Yin"]);
  assert.equal(rows[0].status, "Working on it", "status key -> label");
  assert.equal(rows[0].requester, null);
  assert.equal(rows[1].requester, "Jordan Lee");
});

test("unknown ids degrade to something printable rather than throwing", () => {
  assert.equal(memberName(BOARD, "nope"), "nope");
  assert.equal(requesterName(BOARD, task({ id: "x", groupId: "g1" })), null);
  assert.equal(
    requesterName(BOARD, task({ id: "x", groupId: "g1", requesterId: "gone" })),
    null,
  );
  assert.equal(statusLabel("not_a_status"), "not_a_status");
});

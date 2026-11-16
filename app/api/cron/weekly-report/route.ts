/**
 * Scheduled weekly report.
 *
 * Vercel calls this on the schedule in vercel.json: "30 10 * * 5", which
 * is Friday 10:30 UTC. vercel.json cron schedules are UTC-only and cannot
 * carry a comment, so to be explicit — that is Friday 18:30 in Kuala
 * Lumpur (UTC+8). Malaysia observes no daylight saving, so the offset is
 * fixed and this never drifts.
 *
 * It sends the same report the dialog sends, for every board that has
 * opted in, and stamps the tasks it covered as reported.
 *
 * The board data is read and written here rather than passed in, because
 * there is no browser in the loop: the schedule is the caller.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isMailConfigured, sendWeeklyReport } from "@/lib/mailer";
import {
  buildReportSections,
  isEmptyReport,
  reportedTaskIds,
  toMailTasks,
  type ReportBoard,
  type ReportTask,
} from "@/lib/weekly-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const BCC = process.env.MAIL_BCC ?? "";

/**
 * A board is not re-sent within this window. Vercel can retry a schedule,
 * and a duplicate run would mail management the same report twice.
 */
const RESEND_GUARD_MS = 12 * 60 * 60 * 1000;

const SELECT = `id, name, emoji, auto_report_recipients, auto_report_last_sent_at,
   board_groups (id, name),
   board_members (id, name),
   contacts (id, name),
   tasks (id, title, status, group_id, requester_id, reported_at,
          task_assignees (member_id))`;

interface BoardRow {
  id: string;
  name: string;
  emoji: string | null;
  auto_report_recipients: string[] | null;
  auto_report_last_sent_at: string | null;
  board_groups: { id: string; name: string }[] | null;
  board_members: { id: string; name: string }[] | null;
  contacts: { id: string; name: string }[] | null;
  tasks:
    | {
        id: string;
        title: string;
        status: string;
        group_id: string;
        requester_id: string | null;
        task_assignees: { member_id: string }[] | null;
      }[]
    | null;
}

function toReportBoard(row: BoardRow): ReportBoard {
  const tasks: ReportTask[] = (row.tasks ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    groupId: t.group_id,
    assigneeIds: (t.task_assignees ?? []).map((a) => a.member_id),
    requesterId: t.requester_id,
  }));
  return {
    name: row.name,
    emoji: row.emoji ?? undefined,
    groups: row.board_groups ?? [],
    members: row.board_members ?? [],
    contacts: row.contacts ?? [],
    tasks,
  };
}

interface BoardOutcome {
  board: string;
  sent: boolean;
  reason?: string;
  recipients?: number;
  tasksMarked?: number;
}

async function sendForBoard(
  sb: SupabaseClient,
  row: BoardRow,
  now: Date,
): Promise<BoardOutcome> {
  const recipients = (row.auto_report_recipients ?? [])
    .map((e) => e.trim())
    .filter((e) => EMAIL_RE.test(e));
  if (recipients.length === 0) {
    return { board: row.name, sent: false, reason: "no valid recipients" };
  }

  const last = row.auto_report_last_sent_at
    ? Date.parse(row.auto_report_last_sent_at)
    : 0;
  if (last && now.getTime() - last < RESEND_GUARD_MS) {
    return { board: row.name, sent: false, reason: "already sent recently" };
  }

  const board = toReportBoard(row);
  const sections = buildReportSections(board);
  if (isEmptyReport(sections)) {
    // Nothing in any of the three groups — mailing an empty report would
    // only train management to ignore it.
    return { board: row.name, sent: false, reason: "nothing to report" };
  }

  await sendWeeklyReport({
    to: recipients,
    bcc: BCC,
    boardName: board.name,
    boardEmoji: board.emoji,
    senderName: "Momentum (scheduled)",
    thisWeek: toMailTasks(board, sections[0].tasks),
    nextWeek: toMailTasks(board, sections[1].tasks),
    backlog: toMailTasks(board, sections[2].tasks),
  });

  // Only once the mail is away: the stamp means management received it.
  const at = now.toISOString();
  const ids = reportedTaskIds(sections);
  let tasksMarked = 0;
  if (ids.length > 0) {
    const { error, count } = await sb
      .from("tasks")
      .update({ reported_at: at }, { count: "exact" })
      .in("id", ids);
    if (error) console.error("[cron/weekly-report] marking failed", error);
    else tasksMarked = count ?? 0;
  }
  const { error: stampErr } = await sb
    .from("boards")
    .update({ auto_report_last_sent_at: at })
    .eq("id", row.id);
  if (stampErr) console.error("[cron/weekly-report] stamp failed", stampErr);

  return {
    board: row.name,
    sent: true,
    recipients: recipients.length,
    tasksMarked,
  };
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not set on the server." },
      { status: 500 },
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!isMailConfigured()) {
    return NextResponse.json(
      { error: "Mail is not configured on the server." },
      { status: 503 },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Writes need to bypass RLS: board membership is checked against a
  // signed-in user, and a schedule has none.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      {
        error:
          "Supabase URL and SUPABASE_SERVICE_ROLE_KEY are required for the scheduled report.",
      },
      { status: 500 },
    );
  }
  const sb = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await sb
    .from("boards")
    .select(SELECT)
    .eq("auto_report_enabled", true);
  if (error) {
    console.error("[cron/weekly-report] query failed", error);
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  const rows = (data ?? []) as unknown as BoardRow[];
  const now = new Date();
  const results: BoardOutcome[] = [];
  // Sequential on purpose: these go through one SMTP account, and a burst
  // of parallel sends is how you get rate-limited by the mail provider.
  for (const row of rows) {
    try {
      results.push(await sendForBoard(sb, row, now));
    } catch (e) {
      console.error(`[cron/weekly-report] ${row.name} failed`, e);
      results.push({
        board: row.name,
        sent: false,
        reason: e instanceof Error ? e.message : "send failed",
      });
    }
  }

  const sent = results.filter((r) => r.sent).length;
  console.log(
    `[cron/weekly-report] ${sent}/${results.length} board(s) sent`,
    results,
  );
  // 200 even when some boards failed: the schedule ran. The body carries
  // the per-board outcome for the run log.
  return NextResponse.json({ ok: true, boards: results.length, sent, results });
}

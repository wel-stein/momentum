import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

const host = process.env.MAIL_HOST;
const user = process.env.MAIL_USER;
const pass = process.env.MAIL_PASS;
const port = process.env.MAIL_PORT ? Number(process.env.MAIL_PORT) : undefined;
const from = process.env.MAIL_FROM ?? user;

let _transporter: Transporter | null = null;

export function isMailConfigured() {
  return Boolean(host && user && pass);
}

function transporter(): Transporter {
  if (!isMailConfigured()) {
    throw new Error(
      "Mail is not configured. Set MAIL_HOST / MAIL_USER / MAIL_PASS.",
    );
  }
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host,
    ...(port !== undefined ? { port, secure: port === 465 } : {}),
    auth: { user, pass },
  });
  return _transporter;
}

function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------------------------------------------------------------------------
// Invitation email
// ---------------------------------------------------------------------------

export interface InvitationEmail {
  to: string;
  boardId: string;
  boardName: string;
  boardEmoji?: string;
  inviterName?: string;
  inviterEmail?: string;
  origin: string;
}

export async function sendInvitationEmail(p: InvitationEmail) {
  const link = `${p.origin.replace(/\/+$/, "")}/board/${p.boardId}`;
  const inviter = p.inviterName?.trim() || p.inviterEmail || "A teammate";
  const emoji = p.boardEmoji ?? "📋";
  const subject = `${inviter} invited you to "${p.boardName}" on Momentum`;

  const text = [
    `${inviter} added you to the board "${p.boardName}" on Momentum.`,
    "",
    `Open the board: ${link}`,
    "",
    `If the link asks you to sign in, use your Google account associated`,
    `with this email address (${p.to}).`,
  ].join("\n");

  const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,Segoe UI,Inter,Helvetica,Arial,sans-serif;color:#111;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
          <tr><td style="padding:24px 24px 8px 24px;">
            <div style="display:inline-flex;align-items:center;gap:8px;">
              <span style="display:inline-block;width:24px;height:24px;border-radius:4px;background:#7c3aed;color:#fff;text-align:center;line-height:24px;font-weight:700;font-size:12px;">M</span>
              <span style="font-weight:600;font-size:14px;color:#111;">Momentum</span>
            </div>
          </td></tr>
          <tr><td style="padding:8px 24px 0 24px;">
            <h1 style="margin:0;font-size:18px;font-weight:600;color:#111;">You've been invited to a board</h1>
            <p style="margin:8px 0 0 0;font-size:13px;color:#52525b;line-height:1.55;">
              <strong>${escape(inviter)}</strong> added you to
              <strong>${escape(emoji)} ${escape(p.boardName)}</strong>.
            </p>
          </td></tr>
          <tr><td style="padding:20px 24px;">
            <a href="${link}" style="display:inline-block;background:#7c3aed;color:#fff;font-size:13px;font-weight:500;padding:10px 16px;border-radius:6px;text-decoration:none;">Open the board</a>
          </td></tr>
          <tr><td style="padding:0 24px 24px 24px;font-size:11px;color:#71717a;line-height:1.5;">
            If the link asks you to sign in, use your Google account at <strong>${escape(p.to)}</strong>.
            Not expecting this email? You can ignore it — no account is created until you sign in.
          </td></tr>
        </table>
        <div style="margin-top:12px;font-size:11px;color:#a1a1aa;">Sent by Momentum.</div>
      </td></tr>
    </table>
  </body>
</html>`;

  await transporter().sendMail({ from, to: p.to, subject, text, html });
}

// ---------------------------------------------------------------------------
// Weekly progress report
// ---------------------------------------------------------------------------

export interface WeeklyReportTask {
  title: string;
  status: string;
  assignees: string[];
}

export interface WeeklyReportEmail {
  to: string[];
  bcc: string;
  boardName: string;
  boardEmoji?: string;
  senderName?: string;
  thisWeek: WeeklyReportTask[];
  nextWeek: WeeklyReportTask[];
  backlog: WeeklyReportTask[];
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function taskListText(tasks: WeeklyReportTask[]): string {
  if (tasks.length === 0) return "  (no tasks)\n";
  return tasks.map((t, i) => `  ${i + 1}) ${t.title} — ${t.status}`).join("\n") + "\n";
}

function taskRowsHtml(tasks: WeeklyReportTask[]): string {
  if (tasks.length === 0) {
    return `<p style="margin:6px 0 0 0;font-size:12px;color:#a1a1aa;font-style:italic;">No tasks in this group.</p>`;
  }
  const rows = tasks
    .map(
      (t, i) => `
        <tr>
          <td style="padding:5px 8px 5px 0;font-size:12px;color:#71717a;vertical-align:top;white-space:nowrap;">${i + 1})</td>
          <td style="padding:5px 0;font-size:13px;color:#18181b;vertical-align:top;">${escape(t.title)}</td>
          <td style="padding:5px 0 5px 16px;font-size:11px;color:#71717a;vertical-align:top;white-space:nowrap;">${escape(t.status)}</td>
        </tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">${rows}</table>`;
}

function sectionHtml(
  heading: string,
  subheading: string,
  accent: string,
  tasks: WeeklyReportTask[],
): string {
  return `
    <tr><td style="padding:20px 24px 0 24px;">
      <div style="border-left:3px solid ${accent};padding-left:10px;margin-bottom:10px;">
        <div style="font-size:13px;font-weight:600;color:#18181b;">${escape(heading)}</div>
        <div style="font-size:11px;color:#71717a;margin-top:2px;">${escape(subheading)}</div>
      </div>
      ${taskRowsHtml(tasks)}
    </td></tr>`;
}

export async function sendWeeklyReport(p: WeeklyReportEmail) {
  const today = new Date();
  const sender = p.senderName?.trim() || "Your team";
  const emoji = p.boardEmoji ?? "📋";
  const subject = `[${p.boardName}] Weekly Progress Update — w/e ${formatDate(today)}`;

  const text = [
    `${emoji} ${p.boardName} — Weekly Progress Update`,
    `Prepared by Momentum on ${formatDate(today)}`,
    "",
    "Task (project) that you & your team member completed this week",
    taskListText(p.thisWeek),
    "Task (project) that you intend to work on next week",
    taskListText(p.nextWeek),
    "Task (project) that in the pipeline for you and your team",
    taskListText(p.backlog),
    "--",
    "Sent via Momentum",
  ].join("\n");

  const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,Segoe UI,Inter,Helvetica,Arial,sans-serif;color:#111;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">

          <!-- Header bar -->
          <tr><td style="background:#1a2744;padding:20px 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:22px;padding-right:12px;vertical-align:middle;">${escape(emoji)}</td>
                <td style="vertical-align:middle;">
                  <div style="font-size:16px;font-weight:700;color:#fff;">${escape(p.boardName)}</div>
                  <div style="font-size:11px;color:#94a3b8;margin-top:3px;">Weekly Progress Update &mdash; ${formatDate(today)}</div>
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- Sender -->
          <tr><td style="padding:14px 24px 0 24px;">
            <p style="margin:0;font-size:12px;color:#71717a;">
              Prepared by <strong style="color:#18181b;">Momentum</strong>
            </p>
          </td></tr>

          <!-- Divider -->
          <tr><td style="padding:12px 24px 0 24px;">
            <div style="height:1px;background:#e4e4e7;"></div>
          </td></tr>

          ${sectionHtml(
            "Task (project) that you & your team member completed this week",
            "Group: This Week",
            "#00c875",
            p.thisWeek,
          )}

          ${sectionHtml(
            "Task (project) that you intend to work on next week",
            "Group: Next Week",
            "#fdab3d",
            p.nextWeek,
          )}

          ${sectionHtml(
            "Task (project) that in the pipeline for you and your team",
            "Group: Backlog",
            "#7c3aed",
            p.backlog,
          )}

          <!-- Footer -->
          <tr><td style="padding:24px;">
            <div style="height:1px;background:#e4e4e7;margin-bottom:14px;"></div>
            <p style="margin:0;font-size:11px;color:#a1a1aa;">Sent via <strong>Momentum</strong> &mdash; boards that move.</p>
          </td></tr>

        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  await transporter().sendMail({
    from,
    to: p.to.join(", "),
    bcc: p.bcc,
    subject,
    text,
    html,
  });
}

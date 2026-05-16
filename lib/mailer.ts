import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

const host = process.env.MAIL_HOST;
const user = process.env.MAIL_USER;
const pass = process.env.MAIL_PASS;
const port = Number(process.env.MAIL_PORT ?? "465");
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
    port,
    secure: port === 465, // 465 = implicit TLS, 587 = STARTTLS
    auth: { user, pass },
  });
  return _transporter;
}

export interface InvitationEmail {
  to: string;
  boardId: string;
  boardName: string;
  boardEmoji?: string;
  inviterName?: string;
  inviterEmail?: string;
  origin: string;
}

function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

  await transporter().sendMail({
    from,
    to: p.to,
    subject,
    text,
    html,
  });
}

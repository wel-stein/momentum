import { NextResponse, type NextRequest } from "next/server";
import { isMailConfigured, sendWeeklyReport, type WeeklyReportTask } from "@/lib/mailer";

export const runtime = "nodejs";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const BCC = process.env.MAIL_BCC ?? "";

interface Payload {
  recipients?: string[];
  boardName?: string;
  boardEmoji?: string;
  senderName?: string;
  thisWeek?: WeeklyReportTask[];
  nextWeek?: WeeklyReportTask[];
  backlog?: WeeklyReportTask[];
}

export async function POST(req: NextRequest) {
  if (!isMailConfigured()) {
    return NextResponse.json(
      { error: "Mail is not configured on the server." },
      { status: 503 },
    );
  }

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const recipients = (body.recipients ?? [])
    .map((e) => e.trim())
    .filter((e) => EMAIL_RE.test(e));

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "At least one valid recipient email is required." },
      { status: 400 },
    );
  }

  const boardName = body.boardName?.trim();
  if (!boardName) {
    return NextResponse.json({ error: "boardName is required." }, { status: 400 });
  }

  try {
    await sendWeeklyReport({
      to: recipients,
      bcc: BCC,
      boardName,
      boardEmoji: body.boardEmoji,
      senderName: body.senderName,
      thisWeek: body.thisWeek ?? [],
      nextWeek: body.nextWeek ?? [],
      backlog: body.backlog ?? [],
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/weekly-report] failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send email." },
      { status: 502 },
    );
  }
}

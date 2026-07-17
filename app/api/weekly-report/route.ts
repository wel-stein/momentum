import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isMailConfigured, sendWeeklyReport, type WeeklyReportTask } from "@/lib/mailer";

export const runtime = "nodejs";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const BCC = process.env.MAIL_BCC ?? "";

// In-memory rate limit: 10 reports / hour per Supabase auth user.
// Resets on server restart (fine here; move to Redis for real scale).
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT = 10;
const buckets = new Map<string, number[]>();

function rateLimit(userId: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  const hits = (buckets.get(userId) ?? []).filter((t) => t > cutoff);
  if (hits.length >= RATE_LIMIT) {
    buckets.set(userId, hits);
    return false;
  }
  hits.push(now);
  buckets.set(userId, hits);
  return true;
}

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

  // Require a signed-in user so random callers can't send email through
  // the configured SMTP account.
  const token = (req.headers.get("authorization") ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) {
    return NextResponse.json(
      { error: "Sign in to send the report." },
      { status: 401 },
    );
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json(
      { error: "Supabase env not configured on the server." },
      { status: 500 },
    );
  }
  const sb = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await sb.auth.getUser(token);
  if (userErr || !userData.user) {
    return NextResponse.json(
      { error: "Invalid or expired session." },
      { status: 401 },
    );
  }
  if (!rateLimit(userData.user.id)) {
    return NextResponse.json(
      { error: `Too many reports (max ${RATE_LIMIT}/hour).` },
      { status: 429 },
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

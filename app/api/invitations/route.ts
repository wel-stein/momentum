import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  isMailConfigured,
  sendInvitationEmail,
} from "@/lib/mailer";

// nodemailer pulls Node APIs; cannot run on edge.
export const runtime = "nodejs";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface Payload {
  to?: string;
  boardId?: string;
  boardName?: string;
  boardEmoji?: string;
  inviterName?: string;
}

// In-memory rate limit: 10 emails / hour per Supabase auth user.
// Resets when the server restarts (fine for a demo; for production move
// this to Redis / Upstash).
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT = 10;
const buckets = new Map<string, number[]>();

function rateLimit(userId: string): { ok: boolean; remaining: number } {
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  const hits = (buckets.get(userId) ?? []).filter((t) => t > cutoff);
  if (hits.length >= RATE_LIMIT) {
    buckets.set(userId, hits);
    return { ok: false, remaining: 0 };
  }
  hits.push(now);
  buckets.set(userId, hits);
  return { ok: true, remaining: RATE_LIMIT - hits.length };
}

export async function POST(req: NextRequest) {
  if (!isMailConfigured()) {
    return NextResponse.json(
      { error: "Mail is not configured on the server." },
      { status: 503 },
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return NextResponse.json(
      { error: "Sign in to send invitations." },
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
  const userId = userData.user.id;

  // Rate limit before any expensive work.
  const rate = rateLimit(userId);
  if (!rate.ok) {
    return NextResponse.json(
      {
        error: `Too many invitations. Try again later (max ${RATE_LIMIT}/hour).`,
      },
      { status: 429 },
    );
  }

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const to = body.to?.trim() ?? "";
  const boardId = body.boardId?.trim() ?? "";
  const boardName = body.boardName?.trim() ?? "";
  if (!EMAIL_RE.test(to)) {
    return NextResponse.json(
      { error: "Recipient email is invalid." },
      { status: 400 },
    );
  }
  if (!boardId || !boardName) {
    return NextResponse.json(
      { error: "boardId and boardName are required." },
      { status: 400 },
    );
  }

  // Caller must be a member of the board they're inviting people into.
  // Defense in depth: even if RLS lets them read board_members, the
  // explicit check here makes the rule obvious.
  const { count: memberCount, error: memberErr } = await sb
    .from("board_members")
    .select("id", { count: "exact", head: true })
    .eq("board_id", boardId)
    .eq("auth_user_id", userId);
  if (memberErr) {
    return NextResponse.json(
      { error: `Failed to verify board membership: ${memberErr.message}` },
      { status: 502 },
    );
  }
  if ((memberCount ?? 0) === 0) {
    return NextResponse.json(
      { error: "You're not a member of this board." },
      { status: 403 },
    );
  }

  const inviterMeta = userData.user.user_metadata ?? {};
  const inviterName =
    body.inviterName?.trim() ||
    (inviterMeta.full_name as string | undefined) ||
    (inviterMeta.name as string | undefined) ||
    userData.user.email?.split("@")[0];

  const origin =
    req.headers.get("origin") ?? new URL(req.url).origin;

  try {
    await sendInvitationEmail({
      to,
      boardId,
      boardName,
      boardEmoji: body.boardEmoji,
      inviterName,
      inviterEmail: userData.user.email ?? undefined,
      origin,
    });
    return NextResponse.json({ ok: true, remaining: rate.remaining });
  } catch (e) {
    console.error("[api/invitations] sendInvitationEmail failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send email." },
      { status: 502 },
    );
  }
}

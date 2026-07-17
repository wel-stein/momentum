import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Calls out to the self-hosted WhatsApp portal (whatsapp-web.js gateway).
export const runtime = "nodejs";

interface Payload {
  to?: string;
  message?: string;
  name?: string | null;
}

// In-memory rate limit: 30 notifications / hour per Supabase auth user.
// Resets on server restart (fine here; move to Redis for real scale).
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT = 30;
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

export async function POST(req: NextRequest) {
  const portalUrl = process.env.WHATSAPP_PORTAL_URL;
  const apiKey = process.env.WHATSAPP_PORTAL_API_KEY;
  const sessionId = process.env.WHATSAPP_PORTAL_SESSION_ID;
  if (!portalUrl || !apiKey || !sessionId) {
    // Not configured — the client falls back to the compose tab.
    return NextResponse.json(
      { error: "WhatsApp portal is not configured on the server." },
      { status: 503 },
    );
  }

  // Require a signed-in user so random callers can't send from the
  // linked number.
  const token = (req.headers.get("authorization") ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) {
    return NextResponse.json({ error: "Sign in to notify." }, { status: 401 });
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
      { error: `Too many notifications (max ${RATE_LIMIT}/hour).` },
      { status: 429 },
    );
  }

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const to = body.to?.trim();
  const message = body.message?.trim();
  if (!to || !message) {
    return NextResponse.json(
      { error: "`to` and `message` are required." },
      { status: 400 },
    );
  }

  // The portal expects POST /api/sessions/:sessionId/send-text with an
  // X-API-Key header and { to, message, name }. It normalizes the number
  // itself (strips non-digits, 0 -> 60) and appends @c.us.
  const endpoint = `${portalUrl.replace(/\/+$/, "")}/api/sessions/${encodeURIComponent(
    sessionId,
  )}/send-text`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({ to, message, name: body.name ?? undefined }),
      // Don't let a hung gateway hold the serverless function open.
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; id?: string; error?: string }
      | null;
    if (!res.ok || !data?.ok) {
      return NextResponse.json(
        {
          error:
            data?.error ??
            `Portal send failed (status ${res.status}).`,
        },
        // 502: the upstream gateway failed, so the client falls back.
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, id: data.id ?? null });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Could not reach the WhatsApp portal.",
      },
      { status: 502 },
    );
  }
}

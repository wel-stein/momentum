"use client";

import { getSupabase } from "./supabase";

export interface PortalSendResult {
  ok: boolean;
  error?: string;
}

/**
 * Ask the app's own server route to relay a WhatsApp message through the
 * self-hosted portal gateway (portal.causewaylink.com.my). The call is
 * server-side so the portal API key stays off the client and there's no
 * CORS / mixed-content hop.
 *
 * `phoneDigits` is an international number without formatting (as produced
 * by normalizePhone). Returns ok:false (rather than throwing) whenever the
 * portal is unconfigured, unauthenticated, or unreachable, so the caller
 * can fall back to the api.whatsapp.com compose tab.
 */
export async function sendWhatsAppViaPortal(
  phoneDigits: string,
  message: string,
  name?: string,
): Promise<PortalSendResult> {
  // Attach the Supabase access token so the server route can gate sending
  // to signed-in users (prevents anyone hitting the deployed URL from
  // firing messages through the linked number).
  let token = "";
  try {
    const sb = getSupabase();
    if (sb) {
      const { data } = await sb.auth.getSession();
      token = data.session?.access_token ?? "";
    }
  } catch {
    // no session — the route will answer 401 and we fall back
  }

  try {
    const res = await fetch("/api/notify-whatsapp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ to: phoneDigits, message, name: name ?? null }),
    });
    if (res.ok) return { ok: true };
    const data = (await res.json().catch(() => null)) as
      | { error?: string }
      | null;
    return { ok: false, error: data?.error ?? `Portal returned ${res.status}.` };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not reach the server.",
    };
  }
}

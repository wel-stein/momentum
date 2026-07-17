"use client";

/**
 * Optional integration with a locally running OpenClaw gateway
 * (https://docs.openclaw.ai) so completion notifications can be sent
 * directly from the user's own WhatsApp number instead of opening a
 * prefilled api.whatsapp.com compose tab.
 *
 * Configuration is per-browser (localStorage) because the gateway runs on
 * the user's machine (typically http://127.0.0.1) and its token is a
 * personal credential that must never ship in the deployed bundle.
 */

export interface OpenClawConfig {
  enabled: boolean;
  /** Gateway base URL, e.g. http://127.0.0.1:18789 */
  url: string;
  /** Gateway auth token. */
  token: string;
}

const STORAGE_KEY = "momentum-openclaw";

export const OPENCLAW_DEFAULT_URL = "http://127.0.0.1:18789";

export function loadOpenClawConfig(): OpenClawConfig {
  if (typeof window === "undefined")
    return { enabled: false, url: OPENCLAW_DEFAULT_URL, token: "" };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { enabled: false, url: OPENCLAW_DEFAULT_URL, token: "" };
    const parsed = JSON.parse(raw) as Partial<OpenClawConfig>;
    return {
      enabled: Boolean(parsed.enabled),
      url:
        typeof parsed.url === "string" && parsed.url.trim()
          ? parsed.url.trim()
          : OPENCLAW_DEFAULT_URL,
      token: typeof parsed.token === "string" ? parsed.token : "",
    };
  } catch {
    return { enabled: false, url: OPENCLAW_DEFAULT_URL, token: "" };
  }
}

export function saveOpenClawConfig(cfg: OpenClawConfig) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export function isOpenClawReady(cfg: OpenClawConfig): boolean {
  return cfg.enabled && cfg.url.trim().length > 0 && cfg.token.trim().length > 0;
}

export interface OpenClawSendResult {
  ok: boolean;
  error?: string;
}

/**
 * Ask the local OpenClaw gateway to send a WhatsApp message from the
 * user's linked number. `phoneDigits` is an international number without
 * formatting (as produced by normalizePhone).
 */
export async function sendWhatsAppViaOpenClaw(
  cfg: OpenClawConfig,
  phoneDigits: string,
  text: string,
): Promise<OpenClawSendResult> {
  // Implemented against the OpenClaw gateway API — see sendImpl below.
  return sendImpl(cfg, phoneDigits, text);
}

/** Lightweight reachability check used by the settings "Test connection" button. */
export async function testOpenClawConnection(
  cfg: OpenClawConfig,
): Promise<OpenClawSendResult> {
  return testImpl(cfg);
}

// Placeholders — finalized against the documented gateway API.
async function sendImpl(
  cfg: OpenClawConfig,
  phoneDigits: string,
  text: string,
): Promise<OpenClawSendResult> {
  void cfg;
  void phoneDigits;
  void text;
  return { ok: false, error: "OpenClaw integration not implemented yet." };
}

async function testImpl(cfg: OpenClawConfig): Promise<OpenClawSendResult> {
  void cfg;
  return { ok: false, error: "OpenClaw integration not implemented yet." };
}

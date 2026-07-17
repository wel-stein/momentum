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
 *
 * Uses the gateway's WebSocket JSON-RPC `send` method (OpenClaw
 * v2026.7.x): frames are `{type:"req"|"res"|"event", ...}`, the auth
 * token rides in the `connect` handshake params, and side-effecting
 * calls carry an idempotency key. The docs name the recipient/body
 * params as to/target and text/message, so both spellings are sent.
 */
export async function sendWhatsAppViaOpenClaw(
  cfg: OpenClawConfig,
  phoneDigits: string,
  text: string,
): Promise<OpenClawSendResult> {
  const to = `+${phoneDigits}`;
  return gatewayRpc(cfg, {
    method: "send",
    params: {
      channel: "whatsapp",
      to,
      target: to,
      text,
      message: text,
      idempotencyKey: makeIdempotencyKey(),
    },
  });
}

/**
 * Reachability + auth check used by the settings "Test connection"
 * button: performs only the authenticated connect handshake.
 */
export async function testOpenClawConnection(
  cfg: OpenClawConfig,
): Promise<OpenClawSendResult> {
  return gatewayRpc(cfg, null);
}

const CONNECT_ID = "momentum-connect";
const REQUEST_ID = "momentum-request";
/** Budget for the socket to open — unreachable gateways fail fast here. */
const CONNECT_TIMEOUT_MS = 6_000;
/** Overall budget for handshake + request. */
const RPC_TIMEOUT_MS = 15_000;

function makeIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `momentum-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** http(s):// config values become ws(s)://; ws(s):// pass through. */
function toWsUrl(base: string): string | null {
  const trimmed = base.trim().replace(/\/+$/, "");
  const m = /^(https?|wss?):\/\//.exec(trimmed);
  if (!m) return null;
  const scheme = m[1] === "http" ? "ws" : m[1] === "https" ? "wss" : m[1];
  return `${scheme}${trimmed.slice(m[1].length)}`;
}

function frameError(frame: {
  error?: { message?: string } | string | null;
}): string | undefined {
  const err = frame.error;
  if (!err) return undefined;
  if (typeof err === "string") return err;
  if (typeof err.message === "string") return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return undefined;
  }
}

/**
 * Open a socket, authenticate via the `connect` handshake, then (when
 * `request` is non-null) issue one RPC request and resolve with its
 * outcome. Never rejects.
 */
function gatewayRpc(
  cfg: OpenClawConfig,
  request: { method: string; params: Record<string, unknown> } | null,
): Promise<OpenClawSendResult> {
  return new Promise((resolve) => {
    const wsUrl = toWsUrl(cfg.url);
    if (!wsUrl) {
      resolve({
        ok: false,
        error: "Invalid gateway URL — use e.g. http://127.0.0.1:18789.",
      });
      return;
    }
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      resolve({ ok: false, error: "Could not open the gateway URL." });
      return;
    }
    let settled = false;
    const done = (result: OpenClawSendResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(connectTimer);
      try {
        ws.close();
      } catch {
        // already closed
      }
      resolve(result);
    };
    const timer = setTimeout(
      () => done({ ok: false, error: "OpenClaw gateway timed out." }),
      RPC_TIMEOUT_MS,
    );
    const connectTimer = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        done({
          ok: false,
          error:
            "Could not reach the OpenClaw gateway. Is it running, and is this site's origin listed in gateway.controlUi.allowedOrigins?",
        });
      }
    }, CONNECT_TIMEOUT_MS);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "req",
          id: CONNECT_ID,
          method: "connect",
          params: {
            auth: { token: cfg.token },
            client: { name: "momentum", version: "0.1.0", mode: "api" },
          },
        }),
      );
    };
    ws.onmessage = (ev) => {
      let frame: {
        type?: string;
        id?: string;
        ok?: boolean;
        error?: { message?: string } | string | null;
      };
      try {
        frame = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (frame.type !== "res") return; // ignore event frames
      if (frame.id === CONNECT_ID) {
        if (frame.ok === false) {
          done({
            ok: false,
            error:
              frameError(frame) ??
              "Gateway rejected authentication — check the token.",
          });
          return;
        }
        if (!request) {
          done({ ok: true });
          return;
        }
        ws.send(
          JSON.stringify({
            type: "req",
            id: REQUEST_ID,
            method: request.method,
            params: request.params,
          }),
        );
      } else if (frame.id === REQUEST_ID) {
        if (frame.ok === false) {
          done({
            ok: false,
            error: frameError(frame) ?? "Gateway refused the request.",
          });
          return;
        }
        done({ ok: true });
      }
    };
    ws.onerror = () => {
      done({
        ok: false,
        error:
          "Could not reach the OpenClaw gateway. Is it running, and is this site's origin listed in gateway.controlUi.allowedOrigins?",
      });
    };
    ws.onclose = () => {
      done({
        ok: false,
        error: "Gateway connection closed before the request completed.",
      });
    };
  });
}

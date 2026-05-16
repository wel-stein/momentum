"use client";

import { useEffect, useRef } from "react";
import { signInWithGoogleIdToken } from "@/lib/auth";
import { useUser } from "./AuthProvider";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (opts: Record<string, unknown>) => void;
          prompt: (cb?: (notification: unknown) => void) => void;
          cancel: () => void;
        };
      };
    };
  }
}

const SCRIPT_URL = "https://accounts.google.com/gsi/client";

async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  // 16 random bytes → base64url; both sides see the same string.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const raw = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(raw),
  );
  const hashed = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { raw, hashed };
}

/**
 * Renders nothing; on mount, loads Google Identity Services and triggers the
 * One Tap / FedCM prompt for users who aren't signed in. Requires
 * NEXT_PUBLIC_GOOGLE_CLIENT_ID — otherwise this is a no-op.
 *
 * Mounted once at the root via AuthProvider so it can appear on any page.
 * Google Identity Services has its own cooldown logic so it won't re-prompt
 * if the user dismissed a recent prompt.
 */
export function GoogleOneTap() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const user = useUser();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!clientId) return;
    if (user) return;
    if (initializedRef.current) return;

    if (
      !document.querySelector(`script[src="${SCRIPT_URL}"]`)
    ) {
      const s = document.createElement("script");
      s.src = SCRIPT_URL;
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }

    let cancelled = false;
    let pollHandle: ReturnType<typeof setInterval> | null = null;

    const init = async () => {
      const { raw, hashed } = await makeNonce();
      const id = window.google?.accounts?.id;
      if (!id || cancelled) return false;
      id.initialize({
        client_id: clientId,
        callback: async (response: { credential: string }) => {
          try {
            await signInWithGoogleIdToken(response.credential, raw);
          } catch (err) {
            console.error("[google one-tap] sign-in failed", err);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true,
        nonce: hashed,
        itp_support: true,
      });
      id.prompt();
      initializedRef.current = true;
      return true;
    };

    void init().then((ok) => {
      if (ok || cancelled) return;
      pollHandle = setInterval(() => {
        void init().then((ready) => {
          if (ready && pollHandle) {
            clearInterval(pollHandle);
            pollHandle = null;
          }
        });
      }, 250);
    });

    return () => {
      cancelled = true;
      if (pollHandle) clearInterval(pollHandle);
    };
  }, [clientId, user]);

  return null;
}

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

/**
 * Renders nothing; on mount, loads Google Identity Services and triggers the
 * One Tap / FedCM prompt for users who aren't signed in. Requires
 * NEXT_PUBLIC_GOOGLE_CLIENT_ID to be set — otherwise this is a no-op.
 */
export function GoogleOneTap() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const user = useUser();
  const promptedRef = useRef(false);

  useEffect(() => {
    if (!clientId) return;
    if (user) return; // already signed in
    if (promptedRef.current) return;

    const existing = document.querySelector(
      `script[src="${SCRIPT_URL}"]`,
    ) as HTMLScriptElement | null;
    if (!existing) {
      const s = document.createElement("script");
      s.src = SCRIPT_URL;
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }

    let cancelled = false;
    const tryInit = () => {
      if (cancelled) return true;
      const id = window.google?.accounts?.id;
      if (!id) return false;
      id.initialize({
        client_id: clientId,
        callback: async (response: { credential: string }) => {
          try {
            await signInWithGoogleIdToken(response.credential);
          } catch (err) {
            console.error("[google one-tap] sign-in failed", err);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true,
      });
      id.prompt();
      promptedRef.current = true;
      return true;
    };

    if (!tryInit()) {
      const interval = setInterval(() => {
        if (tryInit()) clearInterval(interval);
      }, 250);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }
  }, [clientId, user]);

  return null;
}

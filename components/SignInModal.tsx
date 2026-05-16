"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { signInWithGoogleRedirect } from "@/lib/auth";
import { Modal } from "./Modal";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SignInModal({ open, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onClick = async () => {
    setBusy(true);
    setErr(null);
    try {
      await signInWithGoogleRedirect();
    } catch (e) {
      setErr(
        e instanceof Error
          ? e.message
          : "Sign-in failed. Make sure Google is enabled in your Supabase project.",
      );
      setBusy(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="Sign in to Momentum" size="sm">
        <div className="space-y-3">
          <p className="text-[12px] leading-relaxed text-fg-muted">
            Sign in with your Google account to create boards, add tasks, and
            invite collaborators. You can still browse and view shared boards
            without an account.
          </p>
          <button
            onClick={onClick}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded border border-line bg-hover px-3 py-2 text-[13px] font-medium text-fg transition hover:bg-hover disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </button>
          {err && (
            <div className="rounded border border-rose-500/30 bg-rose-500/[0.06] px-3 py-2 text-[11px] text-rose-300">
              {err}
            </div>
          )}
          <p className="text-[11px] text-fg-subtle">
            Tip: if your browser shows a Google account prompt at the top of
            the page, click it to sign in instantly.
          </p>
        </div>
      </Modal>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3 0 5.8 1.1 8 3l5.7-5.7C34 6.1 29.3 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.5-5.2L31.2 33c-2 1.4-4.5 2.3-7.2 2.3-5.3 0-9.7-3.3-11.3-8L6.2 32.3C9.5 39.6 16.1 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.1 4.1-3.9 5.5l6.4 5.3C42 35.7 44 30.2 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

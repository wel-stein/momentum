"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, AlertCircle } from "lucide-react";
import type { Board } from "@/lib/types";
import { fetchBoardByToken } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { BoardShell } from "./BoardShell";

export function SharedBoard({ token }: { token: string }) {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "ready"; board: Board }
    | { kind: "missing" }
    | { kind: "unconfigured" }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    if (!isSupabaseConfigured()) {
      setState({ kind: "unconfigured" });
      return;
    }
    (async () => {
      const board = await fetchBoardByToken(token);
      if (cancelled) return;
      setState(board ? { kind: "ready", board } : { kind: "missing" });
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state.kind === "loading") {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        Loading shared board…
      </div>
    );
  }
  if (state.kind === "unconfigured") {
    return (
      <CenteredMessage
        title="Sharing is not configured"
        body="The site owner hasn't connected Supabase, so view-only links aren't available."
      />
    );
  }
  if (state.kind === "missing") {
    return (
      <CenteredMessage
        title="Shared link is invalid or revoked"
        body="The owner may have turned off sharing or removed this board."
      />
    );
  }
  return <BoardShell boardId={state.board.id} board={state.board} readOnly />;
}

function CenteredMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-rose-50 text-rose-600">
        <AlertCircle className="h-5 w-5" />
      </div>
      <div className="text-base font-semibold text-slate-900">{title}</div>
      <p className="max-w-sm text-sm text-slate-500">{body}</p>
      <Link
        href="/"
        className="mt-2 inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
      >
        <Eye className="h-3.5 w-3.5" /> Go to Momentum
      </Link>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { useStore, type RemoteChange } from "@/lib/store";

/**
 * Subscribes to Supabase Realtime postgres_changes for the given board and
 * pipes every INSERT / UPDATE / DELETE into useStore.applyRemoteChange.
 *
 * Gated behind NEXT_PUBLIC_ENABLE_REALTIME=true because Supabase Realtime
 * lives behind the Database Replication feature, which is billable on
 * paid plans. When the flag is unset / "false", this component returns
 * null and opens no channel, so it's free to keep mounted. Flip the env
 * var (and enable replication on the five tables in the Supabase
 * dashboard) to turn live updates on.
 */
export function RealtimeSync({ boardId }: { boardId: string }) {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_REALTIME === "true";
  const applyRemoteChange = useStore((s) => s.applyRemoteChange);

  useEffect(() => {
    if (!enabled) return;
    if (!boardId) return;
    const sb = getSupabase();
    if (!sb) return;

    const channel = sb.channel(`momentum:board:${boardId}`);

    const forward =
      (table: RemoteChange["table"]) =>
      (
        payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
      ) => {
        applyRemoteChange({
          eventType: payload.eventType as RemoteChange["eventType"],
          table,
          new:
            (payload.new as Record<string, unknown> | null | undefined) ??
            null,
          old:
            (payload.old as Record<string, unknown> | null | undefined) ??
            null,
        });
      };

    channel
      .on(
        //
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "boards",
          filter: `id=eq.${boardId}`,
        },
        forward("boards"),
      )
      .on(
        //
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "board_groups",
          filter: `board_id=eq.${boardId}`,
        },
        forward("board_groups"),
      )
      .on(
        //
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "board_members",
          filter: `board_id=eq.${boardId}`,
        },
        forward("board_members"),
      )
      .on(
        //
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `board_id=eq.${boardId}`,
        },
        forward("tasks"),
      )
      // task_assignees rows don't carry a board_id, so we can't filter
      // server-side. The reducer searches the local store for the matching
      // task by id, which is cheap.
      .on(
        //
        "postgres_changes",
        { event: "*", schema: "public", table: "task_assignees" },
        forward("task_assignees"),
      )
      .subscribe();

    return () => {
      void sb.removeChannel(channel);
    };
  }, [enabled, boardId, applyRemoteChange]);

  return null;
}

"use client";

import { useCallback } from "react";
import type { Board, StatusKey, Task } from "@/lib/types";
import { buildWhatsAppUrl, completionMessage } from "@/lib/whatsapp";
import { useConfirm } from "./ConfirmDialog";

/**
 * Returns a callback to invoke right after a task's status changes.
 * When the change is a transition into "done" and the task's requester
 * has a valid phone number, it offers to notify them via WhatsApp.
 *
 * Fire-and-forget by design: the status update has already been applied
 * by the time the dialog shows, so declining (or ignoring) the prompt
 * never blocks completion. Without a requester or a usable phone number
 * the prompt is skipped entirely.
 */
export function useRequesterNotify() {
  const confirm = useConfirm();

  return useCallback(
    (board: Board, task: Task, nextStatus: StatusKey) => {
      if (nextStatus !== "done" || task.status === "done") return;
      if (!task.requesterId) return;
      const contact = board.contacts.find((c) => c.id === task.requesterId);
      if (!contact) return;
      const url = buildWhatsAppUrl(
        contact.phone,
        completionMessage(contact.name, task.title),
      );
      if (!url) return;
      void confirm({
        title: "Task completed",
        message: `Would you like to notify the requester that this task has been completed? This opens WhatsApp with a message to ${contact.name}.`,
        confirmLabel: "Yes",
        cancelLabel: "No",
      }).then((yes) => {
        if (yes) window.open(url, "_blank", "noopener,noreferrer");
      });
    },
    [confirm],
  );
}

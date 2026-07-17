"use client";

import { useCallback } from "react";
import type { Board, StatusKey, Task } from "@/lib/types";
import {
  buildWhatsAppUrl,
  completionMessage,
  normalizePhone,
} from "@/lib/whatsapp";
import { sendWhatsAppViaPortal } from "@/lib/whatsapp-portal";
import { useConfirm } from "./ConfirmDialog";

/**
 * Returns a callback to invoke right after a task's status changes.
 * When the change is a transition into "done" and the task's requester
 * has a valid phone number, it offers to notify them via WhatsApp.
 *
 * Delivery: it first tries the self-hosted portal gateway (server-side,
 * sends from the linked number). If the portal is down or unconfigured it
 * falls back to opening a prefilled api.whatsapp.com compose tab.
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
      const digits = normalizePhone(contact.phone);
      if (!digits) return;
      const message = completionMessage(contact.name, task.title);
      const composeUrl = buildWhatsAppUrl(contact.phone, message);
      if (!composeUrl) return;

      void confirm({
        title: "Task completed",
        message: `Would you like to notify the requester that this task has been completed? A WhatsApp message will be sent to ${contact.name}.`,
        confirmLabel: "Yes",
        cancelLabel: "No",
      }).then(async (yes) => {
        if (!yes) return;
        // Try the portal first; it sends from the linked number server-side.
        const result = await sendWhatsAppViaPortal(digits, message, contact.name);
        if (result.ok) return;
        // Portal down / unconfigured / unreachable — fall back to the
        // api.whatsapp.com compose tab. A second confirm gives us a fresh
        // user gesture so the tab isn't swallowed by the popup blocker.
        const openTab = await confirm({
          title: "Send via WhatsApp",
          message: `Couldn't send automatically (${result.error ?? "portal unavailable"}). Open WhatsApp to send the message to ${contact.name} yourself?`,
          confirmLabel: "Open WhatsApp",
          cancelLabel: "Dismiss",
        });
        if (openTab) window.open(composeUrl, "_blank", "noopener,noreferrer");
      });
    },
    [confirm],
  );
}

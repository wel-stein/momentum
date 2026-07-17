"use client";

import { useCallback } from "react";
import type { Board, StatusKey, Task } from "@/lib/types";
import {
  buildWhatsAppUrl,
  completionMessage,
  normalizePhone,
} from "@/lib/whatsapp";
import {
  isOpenClawReady,
  loadOpenClawConfig,
  sendWhatsAppViaOpenClaw,
} from "@/lib/openclaw";
import { useConfirm } from "./ConfirmDialog";

/**
 * Returns a callback to invoke right after a task's status changes.
 * When the change is a transition into "done" and the task's requester
 * has a valid phone number, it offers to notify them via WhatsApp —
 * through a locally configured OpenClaw gateway (sends directly from the
 * user's own number) when available, otherwise by opening a prefilled
 * api.whatsapp.com compose tab.
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
      const openClaw = loadOpenClawConfig();
      const viaOpenClaw = isOpenClawReady(openClaw);

      void confirm({
        title: "Task completed",
        message: viaOpenClaw
          ? `Would you like to notify the requester that this task has been completed? OpenClaw will send the WhatsApp message to ${contact.name} from your number.`
          : `Would you like to notify the requester that this task has been completed? This opens WhatsApp with a message to ${contact.name}.`,
        confirmLabel: "Yes",
        cancelLabel: "No",
      }).then(async (yes) => {
        if (!yes) return;
        if (!viaOpenClaw) {
          window.open(composeUrl, "_blank", "noopener,noreferrer");
          return;
        }
        const result = await sendWhatsAppViaOpenClaw(openClaw, digits, message);
        if (result.ok) return;
        // The gateway is down/unreachable — offer the manual compose tab
        // so the notification can still go out.
        const fallback = await confirm({
          title: "OpenClaw couldn't send the message",
          message: `${result.error ?? "The gateway didn't respond."} Open WhatsApp to send it manually instead?`,
          confirmLabel: "Open WhatsApp",
          cancelLabel: "Dismiss",
        });
        if (fallback) window.open(composeUrl, "_blank", "noopener,noreferrer");
      });
    },
    [confirm],
  );
}

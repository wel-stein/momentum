"use client";

import { useState, KeyboardEvent } from "react";
import { X, Mail, Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Modal } from "./Modal";
import type { Board, Task } from "@/lib/types";
import { STATUSES } from "@/lib/types";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DEFAULT_RECIPIENTS = (
  process.env.NEXT_PUBLIC_MAIL_REPORT_RECIPIENTS ?? ""
)
  .split(",")
  .map((e) => e.trim())
  .filter((e) => EMAIL_RE.test(e));
const BCC_ADDRESS = process.env.NEXT_PUBLIC_MAIL_BCC ?? "";

const GROUP_KEYS = {
  thisWeek: "this week",
  nextWeek: "next week",
  backlog: "backlog",
} as const;

function statusLabel(statusKey: string): string {
  return STATUSES.find((s) => s.key === statusKey)?.label ?? statusKey;
}

function matchGroup(name: string, key: string): boolean {
  return name.trim().toLowerCase() === key;
}

interface TaskSection {
  label: string;
  groupKey: string;
  accent: string;
  tasks: Task[];
}

function buildSections(board: Board): TaskSection[] {
  const groupMap = new Map(board.groups.map((g) => [g.id, g.name]));
  const tasksByGroup = new Map<string, Task[]>();
  for (const task of board.tasks) {
    const arr = tasksByGroup.get(task.groupId) ?? [];
    arr.push(task);
    tasksByGroup.set(task.groupId, arr);
  }

  function tasksFor(key: string): Task[] {
    for (const group of board.groups) {
      if (matchGroup(group.name, key)) {
        return tasksByGroup.get(group.id) ?? [];
      }
    }
    return [];
  }

  return [
    {
      label: "Completed this week",
      groupKey: GROUP_KEYS.thisWeek,
      accent: "#00c875",
      tasks: tasksFor(GROUP_KEYS.thisWeek),
    },
    {
      label: "Planned for next week",
      groupKey: GROUP_KEYS.nextWeek,
      accent: "#fdab3d",
      tasks: tasksFor(GROUP_KEYS.nextWeek),
    },
    {
      label: "In the pipeline",
      groupKey: GROUP_KEYS.backlog,
      accent: "#7c3aed",
      tasks: tasksFor(GROUP_KEYS.backlog),
    },
  ];
}

function memberName(board: Board, id: string): string {
  return board.members.find((m) => m.id === id)?.name ?? id;
}

function requesterName(board: Board, task: Task): string | null {
  if (!task.requesterId) return null;
  return board.contacts.find((c) => c.id === task.requesterId)?.name ?? null;
}

// ---------------------------------------------------------------------------
// Recipient chip input
// ---------------------------------------------------------------------------

function RecipientInput({
  recipients,
  onChange,
}: {
  recipients: string[];
  onChange: (r: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add(email: string) {
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) return;
    if (recipients.includes(e)) {
      setDraft("");
      return;
    }
    onChange([...recipients, e]);
    setDraft("");
  }

  function remove(email: string) {
    onChange(recipients.filter((r) => r !== email));
  }

  function onKeyDown(evt: KeyboardEvent<HTMLInputElement>) {
    if (evt.key === "Enter" || evt.key === "," || evt.key === " ") {
      evt.preventDefault();
      add(draft);
    } else if (evt.key === "Backspace" && draft === "" && recipients.length > 0) {
      remove(recipients[recipients.length - 1]);
    }
  }

  return (
    <div className="flex min-h-[38px] flex-wrap gap-1.5 rounded border border-line bg-surface px-2 py-1.5 focus-within:border-brand-500/40">
      {recipients.map((email) => (
        <span
          key={email}
          className="flex items-center gap-1 rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] text-brand-500"
        >
          {email}
          <button
            type="button"
            onClick={() => remove(email)}
            className="rounded-full hover:text-brand-600"
            aria-label={`Remove ${email}`}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <input
        type="email"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => draft.trim() && add(draft)}
        placeholder={recipients.length === 0 ? "Add email and press Enter…" : ""}
        className="min-w-[160px] flex-1 bg-transparent text-[12px] text-fg placeholder:text-fg-faint focus:outline-none"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task preview list
// ---------------------------------------------------------------------------

function TaskList({ tasks, board, accent }: { tasks: Task[]; board: Board; accent: string }) {
  if (tasks.length === 0) {
    return <p className="py-1 text-[11px] italic text-fg-faint">No tasks found in this group.</p>;
  }
  return (
    <ol className="space-y-1">
      {tasks.map((task, i) => (
        <li key={task.id} className="flex items-start gap-2 text-[12px]">
          <span className="mt-0.5 tabular-nums text-fg-faint">{i + 1}.</span>
          <span className="flex-1 text-fg">
            {task.title}
            {requesterName(board, task) && (
              <span className="ml-1.5 inline-block rounded-full border border-line bg-hover px-1.5 py-px align-middle text-[10px] text-fg-subtle">
                {requesterName(board, task)}
              </span>
            )}
          </span>
          <span className="shrink-0 text-[11px] text-fg-subtle">
            {statusLabel(task.status)}
          </span>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

interface Props {
  board: Board;
  open: boolean;
  onClose: () => void;
  senderName?: string;
}

type SendState = "idle" | "sending" | "success" | "error";

export function WeeklyReportModal({ board, open, onClose, senderName }: Props) {
  const [recipients, setRecipients] = useState<string[]>(DEFAULT_RECIPIENTS);
  const [sendState, setSendState] = useState<SendState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const sections = buildSections(board);

  async function handleSend() {
    if (recipients.length === 0) return;
    setSendState("sending");
    setErrorMsg("");

    function toPayload(tasks: Task[]) {
      return tasks.map((t) => ({
        title: t.title,
        status: statusLabel(t.status),
        assignees: t.assigneeIds.map((id) => memberName(board, id)),
        requester: requesterName(board, t),
      }));
    }

    try {
      const res = await fetch("/api/weekly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients,
          boardName: board.name,
          boardEmoji: board.emoji,
          senderName,
          thisWeek: toPayload(sections[0].tasks),
          nextWeek: toPayload(sections[1].tasks),
          backlog: toPayload(sections[2].tasks),
        }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) {
        setErrorMsg(json.error ?? "Failed to send.");
        setSendState("error");
      } else {
        setSendState("success");
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Network error.");
      setSendState("error");
    }
  }

  function handleClose() {
    setSendState("idle");
    setErrorMsg("");
    onClose();
  }

  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Send weekly progress report"
      size="lg"
      footer={
        sendState === "success" ? (
          <button
            onClick={handleClose}
            className="rounded bg-brand-500 px-3 py-1 text-[12px] font-medium text-white hover:bg-brand-400"
          >
            Done
          </button>
        ) : (
          <>
            <button
              onClick={handleClose}
              className="rounded px-3 py-1 text-[12px] text-fg hover:bg-hover"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={recipients.length === 0 || sendState === "sending"}
              className="inline-flex items-center gap-1.5 rounded bg-brand-500 px-3 py-1 text-[12px] font-medium text-white hover:bg-brand-400 disabled:opacity-40"
            >
              {sendState === "sending" ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="h-3 w-3" />
                  Send report
                </>
              )}
            </button>
          </>
        )
      }
    >
      {sendState === "success" ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle className="h-10 w-10 text-emerald-500" />
          <div>
            <div className="text-[14px] font-medium text-fg">Report sent!</div>
            <div className="mt-1 text-[12px] text-fg-subtle">
              Delivered to {recipients.length} recipient
              {recipients.length !== 1 ? "s" : ""}, BCC'd to {BCC_ADDRESS}.
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Subject preview */}
          <div className="rounded-md border border-line bg-subtle px-3 py-2">
            <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-fg-faint">
              Subject
            </div>
            <div className="text-[12px] text-fg">
              [{board.name}] Weekly Progress Update — w/e {today}
            </div>
          </div>

          {/* Recipients */}
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
              To — Recipients
            </div>
            <RecipientInput recipients={recipients} onChange={setRecipients} />
            <div className="mt-1 flex items-center gap-1 text-[10px] text-fg-faint">
              <Mail className="h-3 w-3" />
              Always BCC'd: {BCC_ADDRESS} &middot; Type an email and press Enter or comma to add
            </div>
          </div>

          {/* Task preview */}
          <div>
            <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
              Email content preview
            </div>
            <div className="space-y-3 rounded-md border border-line bg-subtle p-3">
              {sections.map((section) => (
                <div key={section.groupKey}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-0.5 rounded-full"
                      style={{ background: section.accent }}
                    />
                    <span className="text-[11px] font-semibold text-fg">
                      {section.label}
                    </span>
                    <span className="text-[10px] text-fg-faint">
                      (group: &quot;
                      {section.groupKey.replace(/\b\w/g, (c) => c.toUpperCase())}
                      &quot;)
                    </span>
                    <span
                      className={cn(
                        "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        section.tasks.length > 0
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-hover text-fg-faint",
                      )}
                    >
                      {section.tasks.length} task{section.tasks.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="pl-3">
                    <TaskList tasks={section.tasks} board={board} accent={section.accent} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-fg-faint">
              Tasks are pulled from groups named exactly "This Week", "Next Week", and "Backlog" (case-insensitive).
            </p>
          </div>

          {/* Error */}
          {sendState === "error" && (
            <div className="flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-[12px] text-rose-600">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {errorMsg}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

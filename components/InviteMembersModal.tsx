"use client";

import { useState } from "react";
import { Loader2, Mail, Trash2 } from "lucide-react";
import type { Board, Member } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Modal } from "./Modal";
import { Avatar } from "./Avatar";
import { useAuth, useUser } from "./AuthProvider";

interface Props {
  board: Board;
  open: boolean;
  onClose: () => void;
}

const ROLES: Member["role"][] = ["owner", "admin", "member", "viewer"];

export function InviteMembersModal({ board, open, onClose }: Props) {
  const invite = useStore((s) => s.inviteMember);
  const remove = useStore((s) => s.removeMember);
  const updateRole = useStore((s) => s.updateMemberRole);
  const me = useStore((s) => s.currentUserId);
  const auth = useAuth();
  const user = useUser();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onInvite = async () => {
    setError(null);
    setInfo(null);
    const e = email.trim();
    if (!e || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      setError("Please enter a valid email.");
      return;
    }
    if (board.members.some((m) => m.email.toLowerCase() === e.toLowerCase())) {
      setError("That email is already on the board.");
      return;
    }
    const displayName = name.trim() || e.split("@")[0];
    invite(board.id, displayName, e);

    setBusy(true);
    try {
      const token = auth.session?.access_token;
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          to: e,
          boardId: board.id,
          boardName: board.name,
          boardEmoji: board.emoji,
          inviterName: user?.name,
        }),
      });
      if (res.ok) {
        setInfo(`Invitation email sent to ${e}.`);
      } else {
        const j = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(
          `Added to board, but email failed: ${
            j?.error ?? `HTTP ${res.status}`
          }`,
        );
      }
    } catch (err) {
      setError(
        `Added to board, but email failed: ${
          err instanceof Error ? err.message : "network error"
        }`,
      );
    } finally {
      setBusy(false);
      setName("");
      setEmail("");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Members"
      size="md"
      footer={
        <button
          onClick={onClose}
          className="rounded bg-hover px-3 py-1 text-[12px] font-medium text-fg hover:bg-hover"
        >
          Done
        </button>
      }
    >
      <div className="space-y-4">
        <div className="rounded border border-line bg-surface p-3">
          <div className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
            Invite by email
          </div>
          <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              className="rounded border border-line bg-surface px-2 py-1 text-[12px] text-fg placeholder:text-fg-faint focus:border-brand-500/40 focus:outline-none"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onInvite();
              }}
              placeholder="email@company.com"
              className="rounded border border-line bg-surface px-2 py-1 text-[12px] text-fg placeholder:text-fg-faint focus:border-brand-500/40 focus:outline-none"
            />
            <button
              onClick={() => void onInvite()}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded bg-brand-500 px-3 py-1 text-[12px] font-medium text-white hover:bg-brand-400 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Mail className="h-3 w-3" />
              )}
              Invite
            </button>
          </div>
          {error && (
            <div className="mt-2 text-[11px] text-rose-400">{error}</div>
          )}
          {info && (
            <div className="mt-2 text-[11px] text-emerald-400">{info}</div>
          )}
        </div>

        <div>
          <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
            {board.members.length} member
            {board.members.length === 1 ? "" : "s"}
          </div>
          <div className="divide-y divide-line rounded border border-line">
            {board.members.map((m) => {
              const isMe =
                (user && m.authUserId === user.id) ||
                m.id === me ||
                (!!user && m.email.toLowerCase() === user.email.toLowerCase());
              const display = isMe && user
                ? {
                    ...m,
                    name: user.name,
                    email: user.email,
                    avatarUrl: user.avatarUrl ?? m.avatarUrl ?? null,
                  }
                : m;
              return (
                <div key={m.id} className="flex items-center gap-3 px-3 py-2">
                  <Avatar member={display} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-medium text-fg">
                      {display.name}
                      {isMe && (
                        <span className="ml-1 text-[11px] text-fg-subtle">
                          (you)
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[11px] text-fg-subtle">
                      {display.email}
                    </div>
                  </div>
                  <select
                    value={m.role}
                    disabled={isMe}
                    onChange={(e) =>
                      updateRole(
                        board.id,
                        m.id,
                        e.target.value as Member["role"],
                      )
                    }
                    className="rounded border border-line bg-surface px-1.5 py-0.5 text-[11px] text-fg disabled:opacity-50"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r[0].toUpperCase() + r.slice(1)}
                      </option>
                    ))}
                  </select>
                  {!isMe && m.role !== "owner" && (
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${display.name} from the board?`))
                          remove(board.id, m.id);
                      }}
                      className="rounded p-1 text-fg-subtle hover:bg-rose-500/10 hover:text-rose-400"
                      aria-label={`Remove ${display.name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}

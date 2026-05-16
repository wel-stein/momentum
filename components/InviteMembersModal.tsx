"use client";

import { useState } from "react";
import { Mail, Trash2 } from "lucide-react";
import type { Board, Member } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Modal } from "./Modal";
import { Avatar } from "./Avatar";

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

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onInvite = () => {
    setError(null);
    const e = email.trim();
    if (!e || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      setError("Please enter a valid email.");
      return;
    }
    if (board.members.some((m) => m.email.toLowerCase() === e.toLowerCase())) {
      setError("That email is already on the board.");
      return;
    }
    invite(board.id, name.trim() || e.split("@")[0], e);
    setName("");
    setEmail("");
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
            Add member
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
                if (e.key === "Enter") onInvite();
              }}
              placeholder="email@company.com"
              className="rounded border border-line bg-surface px-2 py-1 text-[12px] text-fg placeholder:text-fg-faint focus:border-brand-500/40 focus:outline-none"
            />
            <button
              onClick={onInvite}
              className="inline-flex items-center gap-1 rounded bg-brand-500 px-3 py-1 text-[12px] font-medium text-white hover:bg-brand-400"
            >
              <Mail className="h-3 w-3" /> Add
            </button>
          </div>
          {error && (
            <div className="mt-2 text-[11px] text-rose-400">{error}</div>
          )}
        </div>

        <div>
          <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
            {board.members.length} member
            {board.members.length === 1 ? "" : "s"}
          </div>
          <div className="divide-y divide-line rounded border border-line">
            {board.members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-3 py-2">
                <Avatar member={m} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-medium text-fg">
                    {m.name}
                    {m.id === me && (
                      <span className="ml-1 text-[11px] text-fg-subtle">
                        (you)
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[11px] text-fg-subtle">
                    {m.email}
                  </div>
                </div>
                <select
                  value={m.role}
                  disabled={m.id === me}
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
                {m.id !== me && m.role !== "owner" && (
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${m.name} from the board?`))
                        remove(board.id, m.id);
                    }}
                    className="rounded p-1 text-fg-subtle hover:bg-rose-500/10 hover:text-rose-400"
                    aria-label={`Remove ${m.name}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

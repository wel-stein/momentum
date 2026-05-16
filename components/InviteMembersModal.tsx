"use client";

import { useState } from "react";
import { Trash2, Mail } from "lucide-react";
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
    if (
      board.members.some((m) => m.email.toLowerCase() === e.toLowerCase())
    ) {
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
      title="Board members"
      size="md"
      footer={
        <button
          onClick={onClose}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Done
        </button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border bg-slate-50 p-3">
          <div className="text-xs font-medium text-slate-600">
            Invite by email
          </div>
          <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              className="rounded-md border bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onInvite();
              }}
              placeholder="email@company.com"
              className="rounded-md border bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            />
            <button
              onClick={onInvite}
              className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Mail className="h-3.5 w-3.5" /> Invite
            </button>
          </div>
          {error && (
            <div className="mt-2 text-xs text-rose-600">{error}</div>
          )}
        </div>

        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            {board.members.length} member
            {board.members.length === 1 ? "" : "s"}
          </div>
          <div className="divide-y rounded-lg border">
            {board.members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 px-3 py-2"
              >
                <Avatar member={m} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {m.name}
                    {m.id === me && (
                      <span className="ml-1 text-xs text-slate-400">(you)</span>
                    )}
                  </div>
                  <div className="truncate text-xs text-slate-500">
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
                  className="rounded-md border bg-white px-2 py-1 text-xs disabled:opacity-50"
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
                    className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Remove ${m.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
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

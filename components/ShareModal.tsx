"use client";

import { useEffect, useState } from "react";
import { Copy, Eye, Link2, ShieldOff } from "lucide-react";
import type { Board } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Modal } from "./Modal";

interface Props {
  board: Board;
  open: boolean;
  onClose: () => void;
}

export function ShareModal({ board, open, onClose }: Props) {
  const enableSharing = useStore((s) => s.enableSharing);
  const disableSharing = useStore((s) => s.disableSharing);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(id);
  }, [copied]);

  const token = board.shareToken;
  const shareUrl = token ? `${origin}/share/${token}` : "";

  const onCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      // ignored
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Share board"
      size="md"
      footer={
        <button
          onClick={onClose}
          className="rounded bg-white/[0.06] px-3 py-1 text-[12px] font-medium text-zinc-200 hover:bg-white/[0.1]"
        >
          Done
        </button>
      }
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded border border-white/[0.08] bg-white/[0.02] p-3">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded bg-brand-500/15 text-brand-300">
            <Eye className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-[13px] font-medium text-zinc-100">
              View-only link
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
              Anyone with the link can see this board and its tasks. They
              cannot edit, add, or delete anything.
            </p>
          </div>
        </div>

        {token ? (
          <>
            <div>
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                Link
              </div>
              <div className="flex gap-2">
                <div className="flex flex-1 items-center gap-2 truncate rounded border border-white/10 bg-ink-900 px-2.5 py-1.5 font-mono text-[11px] text-zinc-300">
                  <Link2 className="h-3 w-3 shrink-0 text-zinc-500" />
                  <span className="truncate" title={shareUrl}>
                    {shareUrl}
                  </span>
                </div>
                <button
                  onClick={onCopy}
                  className="inline-flex items-center gap-1 rounded bg-brand-500 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-brand-400"
                >
                  <Copy className="h-3 w-3" />
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between rounded border border-rose-500/20 bg-rose-500/[0.04] px-3 py-2 text-[11px] text-rose-200">
              <span>Revoking the link makes it stop working immediately.</span>
              <button
                onClick={() => {
                  if (confirm("Revoke this share link?"))
                    disableSharing(board.id);
                }}
                className="inline-flex items-center gap-1 rounded border border-rose-500/30 px-2 py-0.5 text-rose-300 hover:bg-rose-500/10"
              >
                <ShieldOff className="h-3 w-3" /> Revoke
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => enableSharing(board.id)}
            className="w-full rounded bg-brand-500 px-3 py-2 text-[12px] font-medium text-white hover:bg-brand-400"
          >
            Create view-only link
          </button>
        )}
      </div>
    </Modal>
  );
}

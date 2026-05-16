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
      // ignore — some browsers block in non-secure contexts
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
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Done
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border bg-slate-50 p-3">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
            <Eye className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">
              View-only link
            </div>
            <p className="mt-0.5 text-xs text-slate-600">
              Anyone with the link can see this board and its tasks. They
              cannot edit, add, or delete anything.
            </p>
          </div>
        </div>

        {token ? (
          <>
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Link
              </div>
              <div className="flex gap-2">
                <div className="flex flex-1 items-center gap-2 truncate rounded-md border bg-white px-3 py-2 text-sm text-slate-700">
                  <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate" title={shareUrl}>
                    {shareUrl}
                  </span>
                </div>
                <button
                  onClick={onCopy}
                  className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              <span>Revoking the link makes it stop working immediately.</span>
              <button
                onClick={() => {
                  if (confirm("Revoke this share link?"))
                    disableSharing(board.id);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-white px-2 py-1 text-rose-700 hover:bg-rose-100"
              >
                <ShieldOff className="h-3.5 w-3.5" /> Revoke
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => enableSharing(board.id)}
            className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Create view-only link
          </button>
        )}
      </div>
    </Modal>
  );
}

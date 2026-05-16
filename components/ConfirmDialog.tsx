"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";

export interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" tints the confirm button red. */
  tone?: "danger" | "default";
}

type Asker = (opts: ConfirmOptions) => Promise<boolean>;

const Ctx = createContext<Asker | null>(null);

interface Pending extends ConfirmOptions {
  resolve: (v: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const ask = useCallback<Asker>((opts) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  const close = useCallback(
    (result: boolean) => {
      const p = pending;
      setPending(null);
      p?.resolve(result);
    },
    [pending],
  );

  return (
    <Ctx.Provider value={ask}>
      {children}
      <Modal
        open={!!pending}
        onClose={() => close(false)}
        size="sm"
        dismissOnBackdrop={false}
        footer={
          <>
            <button
              onClick={() => close(false)}
              className="rounded px-3 py-1 text-[12px] text-fg hover:bg-hover"
            >
              {pending?.cancelLabel ?? "Cancel"}
            </button>
            <button
              onClick={() => close(true)}
              autoFocus
              className={
                pending?.tone === "danger"
                  ? "rounded bg-rose-500 px-3 py-1 text-[12px] font-medium text-white hover:bg-rose-400"
                  : "rounded bg-brand-500 px-3 py-1 text-[12px] font-medium text-white hover:bg-brand-400"
              }
            >
              {pending?.confirmLabel ??
                (pending?.tone === "danger" ? "Delete" : "Confirm")}
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          {pending?.tone === "danger" && (
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rose-500/15 text-rose-400">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium text-fg">
              {pending?.title}
            </div>
            {pending?.message != null && (
              <div className="mt-1 text-[12px] leading-relaxed text-fg-subtle">
                {pending.message}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </Ctx.Provider>
  );
}

/**
 * Promise-returning confirm dialog. Returns true if the user confirmed.
 * Replaces native window.confirm() with a styled, focus-trapped modal.
 *
 *   if (await confirm({ title: "Delete?", tone: "danger" })) { ... }
 */
export function useConfirm(): Asker {
  const ask = useContext(Ctx);
  if (!ask) {
    // Fallback so the function is always callable; renders nothing fancy.
    return (opts) =>
      Promise.resolve(window.confirm(opts.title));
  }
  return ask;
}

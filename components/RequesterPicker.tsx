"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Check, Plus, UserRound } from "lucide-react";
import type { Contact } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Popover } from "./Popover";

interface Props {
  contacts: Contact[];
  /** Selected contact id, or null/undefined for "no requester". */
  value: string | null | undefined;
  onChange: (next: string | null) => void;
  /**
   * Persist a brand-new contact to the directory and return its id
   * (null if creation failed). The picker selects it right away.
   */
  onCreate: (name: string, phone?: string, email?: string) => string | null;
  disabled?: boolean;
}

/**
 * Single-select requester dropdown over the board's contact directory.
 * Mirrors AssigneePicker's look & feel but adds search and an inline
 * "create new contact" form so a requester can be added on the fly.
 */
export function RequesterPicker({
  contacts,
  value,
  onChange,
  onCreate,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const chosen = contacts.find((c) => c.id === value) ?? null;

  function close() {
    setOpen(false);
    setCreating(false);
    setQuery("");
    setNameDraft("");
    setPhoneDraft("");
    setEmailDraft("");
  }

  function select(id: string | null) {
    onChange(id);
    close();
  }

  function startCreate() {
    setNameDraft(query.trim());
    setCreating(true);
  }

  function submitCreate() {
    const name = nameDraft.trim();
    if (!name) return;
    const id = onCreate(name, phoneDraft.trim() || undefined, emailDraft.trim() || undefined);
    if (id) select(id);
    else close();
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (c.phone ?? "").toLowerCase().includes(q),
      )
    : contacts;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          if (disabled) return;
          e.stopPropagation();
          if (open) close();
          else setOpen(true);
        }}
        className={cn(
          "inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors",
          !disabled && "hover:bg-hover",
        )}
      >
        {chosen ? (
          <span className="inline-flex max-w-[130px] items-center gap-1 text-[12px] text-fg">
            <UserRound className="h-3 w-3 shrink-0 text-fg-subtle" />
            <span className="truncate" title={chosen.name}>
              {chosen.name}
            </span>
          </span>
        ) : disabled ? (
          <span className="px-1 text-[11px] text-fg-faint">—</span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded border border-dashed border-line-strong px-1.5 py-0.5 text-[11px] text-fg-subtle hover:border-line-strong hover:text-fg">
            <Plus className="h-3 w-3" /> Requester
          </span>
        )}
      </button>
      <Popover
        open={open}
        onClose={close}
        anchorRef={ref}
        className="w-64 rounded-md border border-line bg-elevated shadow-xl shadow-black/40"
      >
        {!creating ? (
          <>
            <div className="border-b border-line p-1.5">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Search contacts…"
                className="w-full rounded border border-line bg-surface px-2 py-1 text-[12px] text-fg placeholder:text-fg-faint focus:border-brand-500/40 focus:outline-none"
              />
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {chosen && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    select(null);
                  }}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs text-fg-subtle hover:bg-hover"
                >
                  <span className="grid h-5 w-5 place-items-center">—</span>
                  No requester
                </button>
              )}
              {filtered.length === 0 && (
                <div className="px-3 py-2 text-[11px] text-fg-subtle">
                  {contacts.length === 0
                    ? "No contacts yet — create one below."
                    : "No matching contacts."}
                </div>
              )}
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    select(c.id);
                  }}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs text-fg hover:bg-hover"
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-hover">
                    <UserRound className="h-3 w-3 text-fg-subtle" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{c.name}</span>
                    {(c.phone || c.email) && (
                      <span className="block truncate font-mono text-[10px] text-fg-subtle">
                        {c.phone || c.email}
                      </span>
                    )}
                  </span>
                  {c.id === value && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-brand-400" />
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-line p-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  startCreate();
                }}
                className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-[11px] font-medium text-brand-400 hover:bg-hover"
              >
                <Plus className="h-3 w-3" />
                {q ? `New requester “${query.trim()}”` : "New requester"}
              </button>
            </div>
          </>
        ) : (
          <div
            className="space-y-1.5 p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1 pb-0.5 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
              <button
                type="button"
                onClick={() => setCreating(false)}
                aria-label="Back to contact list"
                className="rounded p-0.5 hover:bg-hover hover:text-fg"
              >
                <ArrowLeft className="h-3 w-3" />
              </button>
              New requester
            </div>
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitCreate();
              }}
              placeholder="Name"
              className="w-full rounded border border-line bg-surface px-2 py-1 text-[12px] text-fg placeholder:text-fg-faint focus:border-brand-500/40 focus:outline-none"
            />
            <input
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitCreate();
              }}
              placeholder="Phone (intl. format, e.g. +1 555 010 4477)"
              className="w-full rounded border border-line bg-surface px-2 py-1 text-[12px] text-fg placeholder:text-fg-faint focus:border-brand-500/40 focus:outline-none"
            />
            <input
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitCreate();
              }}
              placeholder="Email (optional)"
              className="w-full rounded border border-line bg-surface px-2 py-1 text-[12px] text-fg placeholder:text-fg-faint focus:border-brand-500/40 focus:outline-none"
            />
            <p className="text-[10px] leading-snug text-fg-faint">
              A phone number enables the WhatsApp completion notification.
            </p>
            <button
              type="button"
              onClick={submitCreate}
              disabled={!nameDraft.trim()}
              className="w-full rounded bg-brand-500 px-2 py-1 text-[11px] font-medium text-white hover:bg-brand-400 disabled:opacity-40"
            >
              Create &amp; select
            </button>
          </div>
        )}
      </Popover>
    </div>
  );
}

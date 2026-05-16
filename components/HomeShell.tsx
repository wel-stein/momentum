"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, LayoutGrid, Layout, Calendar } from "lucide-react";
import { useStore } from "@/lib/store";
import { Modal } from "./Modal";
import { AvatarStack } from "./Avatar";
import { SyncBanner } from "./SyncBanner";
import { UserMenu } from "./UserMenu";
import { Kbd } from "./Kbd";
import { useAuth, useUser } from "./AuthProvider";
import { formatDateSmart, taskCode } from "@/lib/utils";

export function HomeShell() {
  const hydrated = useStore((s) => s.hydrated);
  const setHydrated = useStore((s) => s.setHydrated);
  const boards = useStore((s) => s.boards);
  const createBoard = useStore((s) => s.createBoard);
  const deleteBoard = useStore((s) => s.deleteBoard);
  const auth = useAuth();
  const user = useUser();

  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!auth.ready) return;
    void setHydrated();
  }, [setHydrated, auth.ready]);

  // C → new board (signed-in only)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!user) return;
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable)
          return;
      }
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        setShowNew(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [user]);

  if (!auth.ready || !hydrated) {
    return (
      <div className="flex h-screen items-center justify-center text-zinc-600 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SyncBanner />
      <header className="border-b border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-6 w-6 place-items-center rounded bg-brand-500 text-white">
              <span className="text-[11px] font-bold tracking-tight">M</span>
            </div>
            <div className="text-[13px] font-medium tracking-tight text-zinc-100">
              Momentum
            </div>
            <span className="font-mono text-[10px] text-zinc-600">v0.1</span>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <button
                onClick={() => setShowNew(true)}
                className="inline-flex items-center gap-1.5 rounded bg-brand-500 px-2.5 py-1 text-[12px] font-medium text-white hover:bg-brand-400"
              >
                <Plus className="h-3 w-3" />
                New board
                <Kbd className="ml-1 border-white/20 bg-white/10 text-white/80">
                  C
                </Kbd>
              </button>
            )}
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h1 className="text-xl font-medium tracking-tight text-zinc-100">
              Your boards
            </h1>
            <p className="mt-0.5 text-[12px] text-zinc-500">
              {boards.length} board{boards.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {boards.length === 0 ? (
          <EmptyState onCreate={user ? () => setShowNew(true) : undefined} />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((b) => {
              const taskCount = b.tasks.length;
              const doneCount = b.tasks.filter(
                (t) => t.status === "done",
              ).length;
              const progress =
                taskCount === 0 ? 0 : Math.round((doneCount / taskCount) * 100);
              return (
                <div
                  key={b.id}
                  className="group relative overflow-hidden rounded-md border border-white/[0.07] bg-ink-850 transition-colors hover:border-white/[0.14]"
                >
                  <Link href={`/board/${b.id}`} className="block p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded bg-white/[0.05] text-base">
                          {b.emoji}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[13px] font-medium tracking-tight text-zinc-100">
                              {b.name}
                            </span>
                            <span className="font-mono text-[10px] text-zinc-600">
                              {taskCode(b.id)}
                            </span>
                          </div>
                          {b.description && (
                            <div className="mt-0.5 line-clamp-1 text-[11px] text-zinc-500">
                              {b.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <ViewIcon view={b.view} />
                    </div>
                    <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className="h-full bg-brand-500/70"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
                      <div className="tabular-nums">
                        {doneCount} / {taskCount} done
                      </div>
                      <AvatarStack members={b.members} max={3} size="xs" />
                    </div>
                    <div className="mt-1 text-[10px] tabular-nums text-zinc-600">
                      Updated {formatDateSmart(b.updatedAt)}
                    </div>
                  </Link>
                  {user && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        if (
                          confirm(`Delete "${b.name}"? This cannot be undone.`)
                        ) {
                          deleteBoard(b.id);
                        }
                      }}
                      aria-label="Delete board"
                      className="absolute right-2 top-2 hidden rounded p-1 text-zinc-600 hover:bg-rose-500/10 hover:text-rose-400 group-hover:block"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="Create a board"
        footer={
          <>
            <button
              onClick={() => setShowNew(false)}
              className="rounded px-3 py-1 text-[12px] text-zinc-300 hover:bg-white/[0.06]"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!name.trim()) return;
                const id = createBoard(
                  name.trim(),
                  description.trim() || undefined,
                );
                setName("");
                setDescription("");
                setShowNew(false);
                window.location.href = `/board/${id}`;
              }}
              className="rounded bg-brand-500 px-3 py-1 text-[12px] font-medium text-white hover:bg-brand-400"
            >
              Create board
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Board name
            </div>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Product launch"
              className="w-full rounded border border-white/10 bg-ink-900 px-2.5 py-1.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:border-brand-500/40 focus:outline-none"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Description (optional)
            </div>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this board about?"
              className="w-full resize-none rounded border border-white/10 bg-ink-900 px-2.5 py-1.5 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:border-brand-500/40 focus:outline-none"
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}

function ViewIcon({ view }: { view: string }) {
  const map: Record<string, React.ReactNode> = {
    kanban: <LayoutGrid className="h-3.5 w-3.5" />,
    table: <Layout className="h-3.5 w-3.5" />,
    timeline: <Calendar className="h-3.5 w-3.5" />,
  };
  return (
    <span className="grid h-6 w-6 place-items-center rounded bg-white/[0.04] text-zinc-500">
      {map[view]}
    </span>
  );
}

function EmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <div className="rounded-md border border-dashed border-white/[0.08] bg-white/[0.015] p-12 text-center">
      <h2 className="text-[14px] font-medium tracking-tight text-zinc-200">
        No boards yet
      </h2>
      <p className="mt-1 text-[12px] text-zinc-500">
        {onCreate
          ? "Create your first board to start tracking work."
          : "Sign in with Google to create your first board."}
      </p>
      {onCreate && (
        <button
          onClick={onCreate}
          className="mt-4 inline-flex items-center gap-1.5 rounded bg-brand-500 px-2.5 py-1 text-[12px] font-medium text-white hover:bg-brand-400"
        >
          <Plus className="h-3 w-3" /> New board
          <Kbd className="ml-1 border-white/20 bg-white/10 text-white/80">
            C
          </Kbd>
        </button>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Layout,
  LayoutGrid,
  Calendar,
  Users,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Modal } from "./Modal";
import { AvatarStack } from "./Avatar";
import { SyncBanner } from "./SyncBanner";
import { UserMenu } from "./UserMenu";
import { useAuth, useUser } from "./AuthProvider";
import { formatDateLong } from "@/lib/utils";

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

  // Hydrate once auth is ready so the store knows whether to seed
  // (skipped for anonymous users, who can't write to Supabase).
  useEffect(() => {
    if (!auth.ready) return;
    void setHydrated();
  }, [setHydrated, auth.ready]);

  if (!auth.ready || !hydrated) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SyncBanner />
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white">
              <Layout className="h-4 w-4" />
            </div>
            <div>
              <div className="text-base font-semibold">Momentum</div>
              <div className="text-[11px] text-slate-500">
                Boards that move with you
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <button
                onClick={() => setShowNew(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
              >
                <Plus className="h-4 w-4" /> New board
              </button>
            )}
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Your boards</h1>
          <p className="text-sm text-slate-500">
            {boards.length} board{boards.length === 1 ? "" : "s"}
          </p>
        </div>

        {boards.length === 0 ? (
          <EmptyState
            onCreate={user ? () => setShowNew(true) : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((b) => {
              const taskCount = b.tasks.length;
              const doneCount = b.tasks.filter((t) => t.status === "done").length;
              return (
                <div
                  key={b.id}
                  className="group relative overflow-hidden rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <Link href={`/board/${b.id}`} className="block">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-xl">
                          {b.emoji}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900">
                            {b.name}
                          </div>
                          {b.description && (
                            <div className="mt-0.5 truncate text-xs text-slate-500">
                              {b.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <ViewIcon view={b.view} />
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-xs text-slate-500">
                        {taskCount} task{taskCount === 1 ? "" : "s"} ·{" "}
                        {doneCount} done
                      </div>
                      <AvatarStack members={b.members} max={3} size="sm" />
                    </div>
                    <div className="mt-2 text-[11px] text-slate-400">
                      Updated {formatDateLong(b.updatedAt)}
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
                      className="absolute right-3 top-3 hidden rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 group-hover:block"
                    >
                      <Trash2 className="h-4 w-4" />
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
              className="rounded-md px-3 py-1.5 text-sm hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!name.trim()) return;
                const id = createBoard(name.trim(), description.trim() || undefined);
                setName("");
                setDescription("");
                setShowNew(false);
                window.location.href = `/board/${id}`;
              }}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              Create board
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block">
            <div className="mb-1 text-xs font-medium text-slate-600">
              Board name
            </div>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Product launch"
              className="w-full rounded-md border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-medium text-slate-600">
              Description (optional)
            </div>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this board about?"
              className="w-full resize-none rounded-md border px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}

function ViewIcon({ view }: { view: string }) {
  const map: Record<string, React.ReactNode> = {
    kanban: <LayoutGrid className="h-4 w-4" />,
    table: <Layout className="h-4 w-4" />,
    timeline: <Calendar className="h-4 w-4" />,
  };
  return (
    <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-100 text-slate-500">
      {map[view]}
    </span>
  );
}

function EmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <div className="rounded-xl border border-dashed bg-white p-12 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600">
        <Users className="h-6 w-6" />
      </div>
      <h2 className="mt-3 text-lg font-semibold">No boards yet</h2>
      <p className="mt-1 text-sm text-slate-500">
        {onCreate
          ? "Create your first board to start tracking work."
          : "Sign in with Google to create your first board."}
      </p>
      {onCreate && (
        <button
          onClick={onCreate}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> New board
        </button>
      )}
    </div>
  );
}

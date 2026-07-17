"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Crown, LogOut, Mail } from "lucide-react";
import { useStore } from "@/lib/store";
import { signOut } from "@/lib/auth";
import { Avatar, AvatarStack } from "./Avatar";
import { OpenClawSettings } from "./OpenClawSettings";
import { SyncBanner } from "./SyncBanner";
import { UserMenu } from "./UserMenu";
import { useAuth, useUser } from "./AuthProvider";
import { pickAvatarColor, taskCode } from "@/lib/utils";

export function ProfileShell() {
  const auth = useAuth();
  const user = useUser();
  const router = useRouter();
  const hydrated = useStore((s) => s.hydrated);
  const setHydrated = useStore((s) => s.setHydrated);
  const boards = useStore((s) => s.boards);

  useEffect(() => {
    if (!auth.ready) return;
    if (!user) {
      router.replace("/");
      return;
    }
    void setHydrated();
  }, [auth.ready, user, router, setHydrated]);

  const summary = useMemo(() => {
    if (!user) {
      return { ownedBoards: [], memberBoards: [], tasks: 0, done: 0 };
    }
    const ownedBoards = boards.filter((b) =>
      b.members.some(
        (m) => m.authUserId === user.id && m.role === "owner",
      ),
    );
    const memberBoards = boards.filter((b) =>
      b.members.some((m) => m.authUserId === user.id && m.role !== "owner"),
    );
    const myMemberIds = new Set(
      boards.flatMap((b) =>
        b.members.filter((m) => m.authUserId === user.id).map((m) => m.id),
      ),
    );
    const myTasks = boards.flatMap((b) =>
      b.tasks.filter((t) => t.assigneeIds.some((id) => myMemberIds.has(id))),
    );
    const done = myTasks.filter((t) => t.status === "done").length;
    return {
      ownedBoards,
      memberBoards,
      tasks: myTasks.length,
      done,
    };
  }, [boards, user]);

  if (!auth.ready || !user) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-fg-faint">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SyncBanner />
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded p-1 text-[12px] text-fg-muted hover:bg-hover hover:text-fg"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Boards
          </Link>
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="mb-5 text-xl font-medium tracking-tight text-fg">
          Profile
        </h1>

        <section className="rounded-md border border-line bg-surface p-5">
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <Avatar
                size="lg"
                className="h-16 w-16 text-lg"
                member={{
                  name: user.name,
                  avatarColor: pickAvatarColor(user.email),
                  avatarUrl: user.avatarUrl ?? null,
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-medium text-fg">
                {user.name}
              </div>
              <div className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-fg-subtle">
                <Mail className="h-3 w-3" /> {user.email}
              </div>
              <div className="mt-1 font-mono text-[10px] text-fg-faint">
                uid · {user.id}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <Stat label="Boards" value={boards.length} />
            <Stat label="Owned" value={summary.ownedBoards.length} />
            <Stat
              label="Tasks done"
              value={summary.done}
              hint={
                summary.tasks > 0
                  ? `${summary.done} / ${summary.tasks}`
                  : undefined
              }
            />
          </div>
        </section>

        <section className="mt-4 rounded-md border border-line bg-surface p-5">
          <h2 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
            Boards you own
          </h2>
          {summary.ownedBoards.length === 0 ? (
            <p className="text-[12px] text-fg-subtle">
              You haven't created any boards yet.{" "}
              <Link
                href="/"
                className="text-brand-300 underline-offset-2 hover:underline"
              >
                Go create one.
              </Link>
            </p>
          ) : (
            <div className="divide-y divide-line">
              {summary.ownedBoards.map((b) => (
                <BoardRow key={b.id} boardId={b.id} title={b.name} emoji={b.emoji} members={b.members} taskCount={b.tasks.length} doneCount={b.tasks.filter((t) => t.status === "done").length} owner />
              ))}
            </div>
          )}
        </section>

        {summary.memberBoards.length > 0 && (
          <section className="mt-4 rounded-md border border-line bg-surface p-5">
            <h2 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
              Joined boards
            </h2>
            <div className="divide-y divide-line">
              {summary.memberBoards.map((b) => (
                <BoardRow key={b.id} boardId={b.id} title={b.name} emoji={b.emoji} members={b.members} taskCount={b.tasks.length} doneCount={b.tasks.filter((t) => t.status === "done").length} />
              ))}
            </div>
          </section>
        )}

        <OpenClawSettings />

        <section className="mt-4 rounded-md border border-rose-500/15 bg-rose-500/[0.03] p-5">
          <h2 className="text-[10px] font-medium uppercase tracking-wider text-rose-300">
            Account
          </h2>
          <p className="mt-1 text-[12px] text-fg-subtle">
            Signing out clears your local session.
          </p>
          <button
            onClick={async () => {
              await signOut();
              router.replace("/");
            }}
            className="mt-3 inline-flex items-center gap-1.5 rounded border border-rose-500/30 bg-rose-500/[0.06] px-3 py-1.5 text-[12px] font-medium text-rose-200 hover:bg-rose-500/[0.1]"
          >
            <LogOut className="h-3 w-3" /> Sign out
          </button>
        </section>

        {!hydrated && (
          <div className="mt-3 text-[11px] text-fg-faint">
            Syncing your boards…
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded border border-line bg-subtle px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
        {label}
      </div>
      <div className="mt-0.5 text-xl font-medium tabular-nums text-fg">
        {value}
      </div>
      {hint && (
        <div className="text-[10px] tabular-nums text-fg-subtle">{hint}</div>
      )}
    </div>
  );
}

function BoardRow({
  boardId,
  title,
  emoji,
  members,
  taskCount,
  doneCount,
  owner,
}: {
  boardId: string;
  title: string;
  emoji: string;
  members: { id: string; name: string; avatarColor: string; avatarUrl?: string | null }[];
  taskCount: number;
  doneCount: number;
  owner?: boolean;
}) {
  return (
    <Link
      href={`/board/${boardId}`}
      className="flex items-center gap-3 py-2 transition-colors hover:bg-hover"
    >
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded bg-hover text-base">
        {emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-medium text-fg">
            {title}
          </span>
          {owner && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1 py-0 text-[10px] font-medium text-amber-300">
              <Crown className="h-2.5 w-2.5" /> Owner
            </span>
          )}
          <span className="font-mono text-[10px] text-fg-faint">
            {taskCode(boardId)}
          </span>
        </div>
        <div className="text-[11px] tabular-nums text-fg-subtle">
          {doneCount} / {taskCount} done
        </div>
      </div>
      <AvatarStack members={members} max={3} size="xs" />
    </Link>
  );
}

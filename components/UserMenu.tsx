"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogIn, LogOut, User as UserIcon } from "lucide-react";
import { useUser } from "./AuthProvider";
import { signOut } from "@/lib/auth";
import { Avatar } from "./Avatar";
import { SignInModal } from "./SignInModal";
import { pickAvatarColor } from "@/lib/utils";

export function UserMenu() {
  const user = useUser();
  const [showSignIn, setShowSignIn] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowSignIn(true)}
          className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[12px] font-medium text-zinc-200 hover:bg-white/[0.08]"
        >
          <LogIn className="h-3 w-3" />
          Sign in
        </button>
        <SignInModal
          open={showSignIn}
          onClose={() => setShowSignIn(false)}
        />
      </>
    );
  }

  // First name only for the header chip — keeps it compact on board pages.
  const shortName = user.name.split(/\s+/)[0] || user.name;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.02] py-0.5 pl-0.5 pr-2 transition-colors hover:border-white/[0.14] hover:bg-white/[0.06]"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account: ${user.name}`}
      >
        <Avatar
          size="sm"
          member={{
            name: user.name,
            avatarColor: pickAvatarColor(user.email),
            avatarUrl: user.avatarUrl ?? null,
          }}
        />
        <span className="hidden max-w-[120px] truncate text-[12px] font-medium text-zinc-200 sm:inline">
          {shortName}
        </span>
        <ChevronDown className="h-3 w-3 text-zinc-500" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-md border border-white/10 bg-ink-800 shadow-xl shadow-black/40"
        >
          <div className="flex items-center gap-2.5 border-b border-white/10 px-3 py-3">
            <Avatar
              size="lg"
              member={{
                name: user.name,
                avatarColor: pickAvatarColor(user.email),
                avatarUrl: user.avatarUrl ?? null,
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-zinc-100">
                {user.name}
              </div>
              <div className="truncate text-[11px] text-zinc-500">
                {user.email}
              </div>
            </div>
          </div>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-zinc-300 hover:bg-white/[0.06]"
          >
            <UserIcon className="h-3.5 w-3.5" /> Profile
          </Link>
          <button
            onClick={async () => {
              setOpen(false);
              await signOut();
            }}
            className="flex w-full items-center gap-2 border-t border-white/[0.06] px-3 py-2 text-left text-[12px] text-zinc-300 hover:bg-white/[0.06]"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

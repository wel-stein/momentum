"use client";

import { useEffect, useRef, useState } from "react";
import { LogIn, LogOut } from "lucide-react";
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center rounded-full transition hover:opacity-90"
        aria-label="Account menu"
      >
        <Avatar
          size="md"
          member={{
            name: user.name,
            avatarColor: pickAvatarColor(user.email),
            avatarUrl: user.avatarUrl ?? null,
          }}
        />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-md border border-white/10 bg-ink-800 shadow-xl shadow-black/40">
          <div className="border-b border-white/10 px-3 py-2.5">
            <div className="truncate text-[13px] font-medium text-zinc-100">
              {user.name}
            </div>
            <div className="truncate text-[11px] text-zinc-500">
              {user.email}
            </div>
          </div>
          <button
            onClick={async () => {
              setOpen(false);
              await signOut();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-zinc-300 hover:bg-white/[0.06]"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

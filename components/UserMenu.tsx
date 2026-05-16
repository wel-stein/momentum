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
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <LogIn className="h-3.5 w-3.5" />
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
        className="flex items-center rounded-full ring-0 hover:ring-2 hover:ring-brand-200"
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
        <div className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-md border bg-white shadow-lg">
          <div className="border-b px-3 py-3">
            <div className="text-sm font-semibold text-slate-900 truncate">
              {user.name}
            </div>
            <div className="truncate text-xs text-slate-500">{user.email}</div>
          </div>
          <button
            onClick={async () => {
              setOpen(false);
              await signOut();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

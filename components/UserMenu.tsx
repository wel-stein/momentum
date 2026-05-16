"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogIn, LogOut, User as UserIcon } from "lucide-react";
import { useUser } from "./AuthProvider";
import { signOut } from "@/lib/auth";
import { Avatar } from "./Avatar";
import { SignInModal } from "./SignInModal";
import { ThemeToggle } from "./ThemeToggle";
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
      <div className="flex items-center gap-2">
        <ThemeToggle variant="compact" />
        <button
          onClick={() => setShowSignIn(true)}
          className="inline-flex items-center gap-1.5 rounded border border-line bg-surface px-2.5 py-1 text-[12px] font-medium text-fg hover:bg-hover"
        >
          <LogIn className="h-3 w-3" />
          Sign in
        </button>
        <SignInModal
          open={showSignIn}
          onClose={() => setShowSignIn(false)}
        />
      </div>
    );
  }

  // First name only for the header chip — keeps it compact on board pages.
  const shortName = user.name.split(/\s+/)[0] || user.name;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-subtle py-0.5 pl-0.5 pr-2 transition-colors hover:border-line-strong hover:bg-hover"
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
        <span className="hidden max-w-[120px] truncate text-[12px] font-medium text-fg sm:inline">
          {shortName}
        </span>
        <ChevronDown className="h-3 w-3 text-fg-subtle" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-md border border-line bg-elevated shadow-xl shadow-black/40"
        >
          <div className="flex items-center gap-2.5 border-b border-line px-3 py-3">
            <Avatar
              size="lg"
              member={{
                name: user.name,
                avatarColor: pickAvatarColor(user.email),
                avatarUrl: user.avatarUrl ?? null,
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-fg">
                {user.name}
              </div>
              <div className="truncate text-[11px] text-fg-subtle">
                {user.email}
              </div>
            </div>
          </div>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-fg hover:bg-hover"
          >
            <UserIcon className="h-3.5 w-3.5" /> Profile
          </Link>
          <div className="flex items-center justify-between border-t border-line px-3 py-2">
            <span className="text-[11px] uppercase tracking-wider text-fg-subtle">
              Theme
            </span>
            <ThemeToggle />
          </div>
          <button
            onClick={async () => {
              setOpen(false);
              await signOut();
            }}
            className="flex w-full items-center gap-2 border-t border-line px-3 py-2 text-left text-[12px] text-fg hover:bg-hover"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

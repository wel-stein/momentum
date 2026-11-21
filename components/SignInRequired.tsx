"use client";

import { useState } from "react";
import { LogIn } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuth, useUser } from "./AuthProvider";
import { SignInModal } from "./SignInModal";
import { UserMenu } from "./UserMenu";

/**
 * Who a personal page (KPI, JD) is scoped to.
 *
 * With Supabase configured, KPI sets and JD modules belong to the signed-in
 * user (migration 0012), so a signed-out visitor is `blocked` and nothing
 * loads. Without Supabase the app runs on local state only, and there is no
 * account to scope to — those pages stay usable, as before.
 */
export function useAccountScope() {
  const auth = useAuth();
  const user = useUser();
  const enforced = isSupabaseConfigured();
  return {
    /** Auth has settled; safe to hydrate. */
    ready: auth.ready,
    userId: user?.id ?? null,
    /** Signed out, and this deployment requires an account. */
    blocked: enforced && auth.ready && !user,
    /** Writes are allowed. */
    canEdit: !enforced || !!user,
  };
}

/** Full-page prompt shown in place of personal content when signed out. */
export function SignInRequired({ what }: { what: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-end px-6 py-3">
          <UserMenu />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <h1 className="text-[15px] font-medium tracking-tight text-fg">
            Sign in to see your {what}
          </h1>
          <p className="mt-1.5 text-[12px] leading-relaxed text-fg-subtle">
            Your {what} are private to your account.
          </p>
          <button
            onClick={() => setOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded bg-brand-500 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-brand-400"
          >
            <LogIn className="h-3.5 w-3.5" />
            Sign in
          </button>
        </div>
      </main>
      <SignInModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      router.replace("/");
      return;
    }
    // supabase-js auto-detects the OAuth code/hash in the URL and exchanges
    // it for a session. Wait for that to settle, then go home.
    void sb.auth.getSession().then(() => {
      router.replace("/");
    });
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center text-slate-400">
      Signing you in…
    </div>
  );
}

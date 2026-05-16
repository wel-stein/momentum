"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (!url || !anon) return null;
  if (_client) return _client;
  _client = createClient(url, anon, {
    auth: {
      // Persist the session to localStorage and silently refresh the JWT
      // so a page reload doesn't dump the user back to sign-in.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: "momentum-auth",
    },
  });
  return _client;
}

export function isSupabaseConfigured() {
  return Boolean(url && anon);
}

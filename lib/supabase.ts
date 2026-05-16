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
    auth: { persistSession: false },
  });
  return _client;
}

export function isSupabaseConfigured() {
  return Boolean(url && anon);
}

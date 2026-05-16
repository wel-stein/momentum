"use client";

import { getSupabase } from "./supabase";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export async function signInWithGoogleRedirect() {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured.");
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
}

// Used by Google One Tap (FedCM): pass the credential to Supabase to mint
// a session without a redirect round-trip.
export async function signInWithGoogleIdToken(
  credential: string,
  nonce?: string,
) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured.");
  const { error } = await sb.auth.signInWithIdToken({
    provider: "google",
    token: credential,
    nonce,
  });
  if (error) throw error;
}

export async function signOut() {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

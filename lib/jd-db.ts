"use client";

import type { JdModule, JdResponsibility } from "./jd-types";
import { getSupabase } from "./supabase";

function logErr(label: string, err: unknown) {
  if (err) console.error(`[momentum/jd-db] ${label}`, err);
}

// "missing" means the row does not exist; null means the query failed —
// only "missing" is safe to treat as "seed the remote from local state".
export async function fetchJdModule(
  id: string,
): Promise<JdModule | null | "missing"> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("jd_modules")
    .select("id, role, title, items, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    logErr("fetchJdModule", error);
    return null;
  }
  if (!data) return "missing";
  return {
    id: data.id as string,
    role: data.role as string,
    title: data.title as string,
    items: Array.isArray(data.items) ? (data.items as JdResponsibility[]) : [],
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

export async function upsertJdModule(mod: JdModule) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("jd_modules").upsert(
    {
      id: mod.id,
      role: mod.role,
      title: mod.title,
      items: mod.items,
      created_at: mod.createdAt,
      updated_at: mod.updatedAt,
    },
    { onConflict: "id" },
  );
  logErr("upsertJdModule", error);
}

"use client";

import type { KpiItem, KpiSet } from "./kpi-types";
import { getSupabase } from "./supabase";

function logErr(label: string, err: unknown) {
  if (err) console.error(`[momentum/kpi-db] ${label}`, err);
}

// Returns null on error (distinguishes "query failed" from "empty table")
export async function fetchAllKpiSets(): Promise<KpiSet[] | null> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("kpi_sets")
    .select("id, year, title, items, created_at, updated_at")
    .order("year", { ascending: false });
  if (error) {
    logErr("fetchAllKpiSets", error);
    return null;
  }
  return (data ?? []).map((row) => ({
    id: row.id as string,
    year: row.year as number,
    title: row.title as string,
    items: Array.isArray(row.items) ? (row.items as KpiItem[]) : [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function upsertKpiSet(kpiSet: KpiSet) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("kpi_sets").upsert(
    {
      id: kpiSet.id,
      year: kpiSet.year,
      title: kpiSet.title,
      items: kpiSet.items,
      created_at: kpiSet.createdAt,
      updated_at: kpiSet.updatedAt,
    },
    { onConflict: "id" },
  );
  logErr("upsertKpiSet", error);
}

export async function deleteKpiSet(setId: string) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("kpi_sets").delete().eq("id", setId);
  logErr("deleteKpiSet", error);
}

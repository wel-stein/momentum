"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import type { KpiItem, KpiSet, KpiSubItem, KpiTargets } from "./kpi-types";

function nowIso() {
  return new Date().toISOString();
}

function emptyTargets(): KpiTargets {
  return { t1: "", t2: "", t3: "", t4: "", t5: "" };
}

interface KpiState {
  sets: KpiSet[];
}

interface KpiActions {
  createSet: (year: number, title?: string) => string;
  deleteSet: (setId: string) => void;
  renameSet: (setId: string, title: string) => void;

  addItem: (setId: string) => string;
  updateItem: (
    setId: string,
    itemId: string,
    patch: Partial<Omit<KpiItem, "id">>,
  ) => void;
  deleteItem: (setId: string, itemId: string) => void;
  reorderItems: (setId: string, items: KpiItem[]) => void;

  addSubItem: (setId: string, itemId: string) => string;
  updateSubItem: (
    setId: string,
    itemId: string,
    subItemId: string,
    patch: Partial<Omit<KpiSubItem, "id">>,
  ) => void;
  deleteSubItem: (setId: string, itemId: string, subItemId: string) => void;
}

function patchItem(
  sets: KpiSet[],
  setId: string,
  itemId: string,
  fn: (item: KpiItem) => KpiItem,
): KpiSet[] {
  return sets.map((k) =>
    k.id !== setId
      ? k
      : {
          ...k,
          updatedAt: nowIso(),
          items: k.items.map((item) => (item.id === itemId ? fn(item) : item)),
        },
  );
}

export const useKpiStore = create<KpiState & KpiActions>()(
  persist(
    (set, get) => ({
      sets: [],

      createSet: (year, title) => {
        const existing = get().sets.find((s) => s.year === year);
        if (existing) return existing.id;
        const now = nowIso();
        const kpiSet: KpiSet = {
          id: nanoid(8),
          year,
          title: title ?? `KPI ${year}`,
          items: [],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ sets: [kpiSet, ...s.sets] }));
        return kpiSet.id;
      },

      deleteSet: (setId) => {
        set((s) => ({ sets: s.sets.filter((ks) => ks.id !== setId) }));
      },

      renameSet: (setId, title) => {
        set((s) => ({
          sets: s.sets.map((ks) =>
            ks.id === setId ? { ...ks, title, updatedAt: nowIso() } : ks,
          ),
        }));
      },

      addItem: (setId) => {
        const ks = get().sets.find((s) => s.id === setId);
        if (!ks) return "";
        const item: KpiItem = {
          id: nanoid(8),
          no: ks.items.length + 1,
          objectives: "",
          subItems: [],
          weightage: 0,
          measurable: "",
          targets: emptyTargets(),
        };
        set((s) => ({
          sets: s.sets.map((k) =>
            k.id === setId
              ? { ...k, items: [...k.items, item], updatedAt: nowIso() }
              : k,
          ),
        }));
        return item.id;
      },

      updateItem: (setId, itemId, patch) => {
        set((s) => ({
          sets: patchItem(s.sets, setId, itemId, (item) => ({
            ...item,
            ...patch,
          })),
        }));
      },

      deleteItem: (setId, itemId) => {
        set((s) => ({
          sets: s.sets.map((k) => {
            if (k.id !== setId) return k;
            const items = k.items
              .filter((item) => item.id !== itemId)
              .map((item, i) => ({ ...item, no: i + 1 }));
            return { ...k, items, updatedAt: nowIso() };
          }),
        }));
      },

      reorderItems: (setId, items) => {
        set((s) => ({
          sets: s.sets.map((k) =>
            k.id === setId
              ? {
                  ...k,
                  items: items.map((item, i) => ({ ...item, no: i + 1 })),
                  updatedAt: nowIso(),
                }
              : k,
          ),
        }));
      },

      addSubItem: (setId, itemId) => {
        const id = nanoid(8);
        const sub: KpiSubItem = {
          id,
          objectives: "",
          measurable: "",
          targets: emptyTargets(),
        };
        set((s) => ({
          sets: patchItem(s.sets, setId, itemId, (item) => ({
            ...item,
            subItems: [...item.subItems, sub],
          })),
        }));
        return id;
      },

      updateSubItem: (setId, itemId, subItemId, patch) => {
        set((s) => ({
          sets: patchItem(s.sets, setId, itemId, (item) => ({
            ...item,
            subItems: item.subItems.map((sub) =>
              sub.id === subItemId ? { ...sub, ...patch } : sub,
            ),
          })),
        }));
      },

      deleteSubItem: (setId, itemId, subItemId) => {
        set((s) => ({
          sets: patchItem(s.sets, setId, itemId, (item) => ({
            ...item,
            subItems: item.subItems.filter((sub) => sub.id !== subItemId),
          })),
        }));
      },
    }),
    {
      name: "momentum-kpi-store",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

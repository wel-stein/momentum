"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { JdModule, JdStatus } from "./jd-types";
import { JD_MODULE_ID, seedJdModule } from "./jd-data";
import { fetchJdModule, upsertJdModule } from "./jd-db";
import { isSupabaseConfigured } from "./supabase";

function nowIso() {
  return new Date().toISOString();
}

function fnf<T>(p: Promise<T>) {
  p.catch((err) => console.error("[momentum/jd-store] sync error", err));
}

// Module-level guards — never persisted, reset on every page load.
let _syncDone = false;
let _syncRunning = false;

interface JdState {
  module: JdModule;
  hydrated: boolean;
  loading: boolean;
}

interface JdActions {
  setHydrated: () => Promise<void>;
  setDutyStatus: (respId: string, dutyId: string, status: JdStatus) => void;
  setDutyEvidence: (respId: string, dutyId: string, evidence: string) => void;
}

function patchDuty(
  mod: JdModule,
  respId: string,
  dutyId: string,
  patch: Partial<{ status: JdStatus; evidence: string }>,
): JdModule {
  return {
    ...mod,
    updatedAt: nowIso(),
    items: mod.items.map((resp) =>
      resp.id !== respId
        ? resp
        : {
            ...resp,
            duties: resp.duties.map((d) =>
              d.id === dutyId ? { ...d, ...patch } : d,
            ),
          },
    ),
  };
}

export const useJdStore = create<JdState & JdActions>()(
  persist(
    (set, get) => ({
      module: seedJdModule(),
      hydrated: false,
      loading: false,

      setHydrated: async () => {
        if (_syncDone || _syncRunning) return;
        _syncRunning = true;
        set({ loading: true });

        if (!isSupabaseConfigured()) {
          set({ hydrated: true, loading: false });
          _syncDone = true;
          _syncRunning = false;
          return;
        }

        const remote = await fetchJdModule(JD_MODULE_ID);
        if (remote === "missing") {
          // Row doesn't exist yet — seed the remote from local state.
          await upsertJdModule(get().module);
          set({ hydrated: true, loading: false });
        } else if (remote) {
          set({ module: remote, hydrated: true, loading: false });
        } else {
          // Query failed — keep local state, don't overwrite the remote.
          set({ hydrated: true, loading: false });
        }

        _syncDone = true;
        _syncRunning = false;
      },

      setDutyStatus: (respId, dutyId, status) => {
        set((s) => ({
          module: patchDuty(s.module, respId, dutyId, { status }),
        }));
        fnf(upsertJdModule(get().module));
      },

      setDutyEvidence: (respId, dutyId, evidence) => {
        set((s) => ({
          module: patchDuty(s.module, respId, dutyId, { evidence }),
        }));
        fnf(upsertJdModule(get().module));
      },
    }),
    {
      name: "momentum-jd-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ module: s.module }),
    },
  ),
);

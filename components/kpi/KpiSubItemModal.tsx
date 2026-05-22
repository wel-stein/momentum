"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { useKpiStore } from "@/lib/kpi-store";
import type { KpiSubItem, KpiTargets } from "@/lib/kpi-types";
import { cn } from "@/lib/utils";

interface Props {
  setId: string;
  itemId: string;
  /** Null = create new sub-item */
  subItem: KpiSubItem | null;
  onClose: () => void;
}

const inputCls =
  "w-full rounded border border-line bg-surface px-2.5 py-1.5 text-[13px] text-fg placeholder:text-fg-faint focus:border-brand-500/40 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
        {label}
      </div>
      {children}
    </label>
  );
}

export function KpiSubItemModal({ setId, itemId, subItem, onClose }: Props) {
  const addSubItem = useKpiStore((s) => s.addSubItem);
  const updateSubItem = useKpiStore((s) => s.updateSubItem);

  const [objectives, setObjectives] = useState(subItem?.objectives ?? "");
  const [measurable, setMeasurable] = useState(subItem?.measurable ?? "");
  const [targets, setTargets] = useState<KpiTargets>(
    subItem?.targets ?? { t1: "", t2: "", t3: "", t4: "", t5: "" },
  );

  const isNew = subItem === null;

  function setTarget(key: keyof KpiTargets, val: string) {
    setTargets((t) => ({ ...t, [key]: val }));
  }

  function handleSave() {
    const patch = {
      objectives: objectives.trim(),
      measurable: measurable.trim(),
      targets,
    };
    if (isNew) {
      const id = addSubItem(setId, itemId);
      if (id) updateSubItem(setId, itemId, id, patch);
    } else {
      updateSubItem(setId, itemId, subItem.id, patch);
    }
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? "Add sub-objective" : "Edit sub-objective"}
      size="lg"
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded px-3 py-1 text-[12px] text-fg hover:bg-hover"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!objectives.trim()}
            className="rounded bg-brand-500 px-3 py-1 text-[12px] font-medium text-white hover:bg-brand-400 disabled:opacity-40"
          >
            {isNew ? "Add sub-objective" : "Save changes"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Sub-objective">
          <input
            autoFocus
            value={objectives}
            onChange={(e) => setObjectives(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && objectives.trim() && handleSave()}
            placeholder="e.g. Reduce Level-2 support turnaround time"
            className={inputCls}
          />
        </Field>

        <Field label="Measurable">
          <textarea
            rows={3}
            value={measurable}
            onChange={(e) => setMeasurable(e.target.value)}
            placeholder="Describe how this sub-objective will be measured"
            className={cn(inputCls, "resize-none")}
          />
        </Field>

        <div>
          <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
            Target level descriptions&ensp;
            <span className="normal-case font-normal text-fg-faint">
              (1 = minimum · 3 = baseline · 5 = outstanding)
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {(["t1", "t2", "t3", "t4", "t5"] as (keyof KpiTargets)[]).map(
              (key, i) => (
                <div key={key}>
                  <div
                    className={cn(
                      "mb-1 text-center text-[10px] font-semibold",
                      i === 2 ? "text-brand-500" : "text-fg-subtle",
                    )}
                  >
                    Level {i + 1}
                  </div>
                  <textarea
                    rows={3}
                    value={targets[key]}
                    onChange={(e) => setTarget(key, e.target.value)}
                    placeholder={i === 2 ? "baseline" : ""}
                    className={cn(
                      inputCls,
                      "resize-none text-center text-[12px]",
                      i === 2 && "border-brand-500/30",
                    )}
                  />
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

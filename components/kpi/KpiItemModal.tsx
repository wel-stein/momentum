"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { useKpiStore } from "@/lib/kpi-store";
import type { KpiItem, KpiTargets } from "@/lib/kpi-types";
import { cn } from "@/lib/utils";

interface Props {
  setId: string;
  item: KpiItem | null;
  onClose: () => void;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
        {label}
      </div>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded border border-line bg-surface px-2.5 py-1.5 text-[13px] text-fg placeholder:text-fg-faint focus:border-brand-500/40 focus:outline-none";

export function KpiItemModal({ setId, item, onClose }: Props) {
  const addItem = useKpiStore((s) => s.addItem);
  const updateItem = useKpiStore((s) => s.updateItem);

  const [objectives, setObjectives] = useState(item?.objectives ?? "");
  const [subItemsText, setSubItemsText] = useState(
    (item?.subItems ?? []).join("\n"),
  );
  const [weightage, setWeightage] = useState(
    item ? String(item.weightage) : "0",
  );
  const [measurable, setMeasurable] = useState(item?.measurable ?? "");
  const [targets, setTargets] = useState<KpiTargets>(
    item?.targets ?? { t1: "", t2: "", t3: "", t4: "", t5: "" },
  );

  const isNew = item === null;
  const totalPct = parseFloat(weightage) || 0;

  function setTarget(key: keyof KpiTargets, val: string) {
    setTargets((t) => ({ ...t, [key]: val }));
  }

  function handleSave() {
    const subItems = subItemsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const patch: Partial<Omit<KpiItem, "id">> = {
      objectives: objectives.trim(),
      subItems,
      weightage: Math.min(100, Math.max(0, parseFloat(weightage) || 0)),
      measurable: measurable.trim(),
      targets,
    };
    if (isNew) {
      const id = addItem(setId);
      if (id) updateItem(setId, id, patch);
    } else {
      updateItem(setId, item.id, patch);
    }
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? "Add KPI item" : "Edit KPI item"}
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
            {isNew ? "Add item" : "Save changes"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label="Objectives">
            <input
              autoFocus
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              placeholder="e.g. Optimize infrastructure costs"
              className={inputCls}
            />
          </Field>
          <Field label="Weightage (%)">
            <input
              type="number"
              min="0"
              max="100"
              value={weightage}
              onChange={(e) => setWeightage(e.target.value)}
              className={cn(inputCls, "w-24 tabular-nums")}
            />
          </Field>
        </div>

        <Field label="Sub-objectives (one per line)">
          <textarea
            rows={3}
            value={subItemsText}
            onChange={(e) => setSubItemsText(e.target.value)}
            placeholder={"1. Reduce cloud spend\n2. Renegotiate vendor contracts"}
            className={cn(inputCls, "resize-none")}
          />
        </Field>

        <Field label="Measurable">
          <textarea
            rows={3}
            value={measurable}
            onChange={(e) => setMeasurable(e.target.value)}
            placeholder={"Percentage of cost reduction"}
            className={cn(inputCls, "resize-none")}
          />
        </Field>

        <div>
          <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-fg-subtle">
            Target levels (1 = minimum → 5 = outstanding)
          </div>
          <div className="grid grid-cols-5 gap-2">
            {(["t1", "t2", "t3", "t4", "t5"] as (keyof KpiTargets)[]).map(
              (key, i) => (
                <div key={key}>
                  <div className="mb-1 text-center text-[10px] font-semibold text-fg-subtle">
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

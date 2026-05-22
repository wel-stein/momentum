"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus, GripVertical } from "lucide-react";
import { useKpiStore } from "@/lib/kpi-store";
import { useConfirm } from "@/components/ConfirmDialog";
import { KpiItemModal } from "./KpiItemModal";
import type { KpiItem } from "@/lib/kpi-types";
import { cn } from "@/lib/utils";

interface Props {
  setId: string;
  items: KpiItem[];
  readonly?: boolean;
}

const TARGET_LABELS = ["1", "2", "3", "4", "5"];
const TARGET_KEYS = ["t1", "t2", "t3", "t4", "t5"] as const;

function WeightBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-12 overflow-hidden rounded-full bg-hover">
        <div
          className="h-full rounded-full bg-brand-500/70"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      <span className="tabular-nums text-[11px] text-fg-muted">{value}%</span>
    </div>
  );
}

export function KpiTable({ setId, items, readonly }: Props) {
  const deleteItem = useKpiStore((s) => s.deleteItem);
  const reorderItems = useKpiStore((s) => s.reorderItems);
  const confirm = useConfirm();

  const [editing, setEditing] = useState<KpiItem | null | "new">(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const totalWeight = items.reduce((sum, item) => sum + item.weightage, 0);

  function handleDragStart(id: string) {
    setDragging(id);
  }

  function handleDrop(targetId: string) {
    if (!dragging || dragging === targetId) {
      setDragging(null);
      setDragOver(null);
      return;
    }
    const next = [...items];
    const fromIdx = next.findIndex((i) => i.id === dragging);
    const toIdx = next.findIndex((i) => i.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    reorderItems(setId, next);
    setDragging(null);
    setDragOver(null);
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[900px] border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#1a2744] text-white">
              {!readonly && <th className="w-6 px-2 py-2.5" />}
              <th className="w-10 px-3 py-2.5 text-center text-[11px] font-semibold tracking-wide">
                No.
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold tracking-wide">
                Objectives
              </th>
              <th className="w-24 px-3 py-2.5 text-center text-[11px] font-semibold tracking-wide">
                Weightage (%)
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold tracking-wide">
                Measurable
              </th>
              {TARGET_LABELS.map((l, i) => (
                <th
                  key={l}
                  className={cn(
                    "w-28 px-2 py-2.5 text-center text-[11px] font-semibold tracking-wide",
                    i === 0 && "border-l border-white/20",
                  )}
                >
                  {i === 0 ? (
                    <div>
                      <div className="text-[9px] font-normal opacity-70">
                        Target
                      </div>
                      <div>{l}</div>
                    </div>
                  ) : (
                    l
                  )}
                </th>
              ))}
              {!readonly && <th className="w-16 px-2 py-2.5" />}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={readonly ? 8 : 10}
                  className="px-4 py-12 text-center text-[12px] text-fg-faint"
                >
                  No KPI items yet. Add your first item below.
                </td>
              </tr>
            )}
            {items.map((item, idx) => {
              const isOver = dragOver === item.id;
              return (
                <tr
                  key={item.id}
                  draggable={!readonly}
                  onDragStart={() => handleDragStart(item.id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(item.id);
                  }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={() => handleDrop(item.id)}
                  className={cn(
                    "border-t border-line transition-colors",
                    idx % 2 === 0 ? "bg-surface" : "bg-subtle/40",
                    isOver && "bg-brand-500/5 outline outline-1 outline-brand-500/30",
                    dragging === item.id && "opacity-40",
                  )}
                >
                  {!readonly && (
                    <td className="px-2 py-3 text-fg-faint">
                      <GripVertical className="h-3.5 w-3.5 cursor-grab active:cursor-grabbing" />
                    </td>
                  )}
                  <td className="px-3 py-3 text-center font-semibold text-fg-muted">
                    {item.no}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-fg">{item.objectives}</div>
                    {item.subItems.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {item.subItems.map((s, i) => (
                          <li key={i} className="text-[11px] text-fg-subtle">
                            {s}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <WeightBar value={item.weightage} />
                  </td>
                  <td className="px-3 py-3 text-fg-muted">
                    <div className="whitespace-pre-line leading-relaxed">
                      {item.measurable}
                    </div>
                  </td>
                  {TARGET_KEYS.map((key, i) => (
                    <td
                      key={key}
                      className={cn(
                        "px-2 py-3 text-center text-fg-muted",
                        i === 0 && "border-l border-line",
                        i === 2 && "bg-brand-500/5 font-medium text-brand-600 dark:text-brand-400",
                      )}
                    >
                      <div className="whitespace-pre-line leading-relaxed text-[11px]">
                        {item.targets[key]}
                      </div>
                    </td>
                  ))}
                  {!readonly && (
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditing(item)}
                          className="rounded p-1 text-fg-faint hover:bg-hover hover:text-fg"
                          title="Edit"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={async () => {
                            if (
                              await confirm({
                                title: "Delete KPI item?",
                                message: `Remove "${item.objectives || `Item ${item.no}`}"? This cannot be undone.`,
                                tone: "danger",
                                confirmLabel: "Delete",
                              })
                            ) {
                              deleteItem(setId, item.id);
                            }
                          }}
                          className="rounded p-1 text-fg-faint hover:bg-rose-500/10 hover:text-rose-500"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr className="border-t border-line-strong bg-subtle">
                {!readonly && <td />}
                <td />
                <td className="px-3 py-2 text-right text-[11px] font-semibold text-fg-subtle">
                  Total
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1 w-12 overflow-hidden rounded-full bg-hover">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          totalWeight === 100
                            ? "bg-emerald-500"
                            : totalWeight > 100
                              ? "bg-rose-500"
                              : "bg-amber-500",
                        )}
                        style={{ width: `${Math.min(100, totalWeight)}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "tabular-nums text-[11px] font-semibold",
                        totalWeight === 100
                          ? "text-emerald-600"
                          : totalWeight > 100
                            ? "text-rose-600"
                            : "text-amber-600",
                      )}
                    >
                      {totalWeight}%
                    </span>
                  </div>
                </td>
                <td colSpan={readonly ? 5 : 6} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {!readonly && (
        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-1.5 rounded border border-dashed border-line px-3 py-1.5 text-[12px] text-fg-subtle hover:border-brand-500/50 hover:text-brand-500"
        >
          <Plus className="h-3.5 w-3.5" />
          Add KPI item
        </button>
      )}

      {editing !== null && (
        <KpiItemModal
          setId={setId}
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

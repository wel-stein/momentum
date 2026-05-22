"use client";

import { Fragment, useState, useRef, useEffect } from "react";
import {
  Trash2,
  Plus,
  GripVertical,
  MessageSquare,
  ChevronRight,
  MoreVertical,
  Pencil,
} from "lucide-react";
import { useKpiStore } from "@/lib/kpi-store";
import { useConfirm } from "@/components/ConfirmDialog";
import { KpiItemModal } from "./KpiItemModal";
import { KpiSubItemModal } from "./KpiSubItemModal";
import type { KpiItem, KpiSubItem } from "@/lib/kpi-types";
import {
  perLevelWeight,
  perSubItemLevelWeight,
  itemAchievedScore,
} from "@/lib/kpi-types";
import { cn } from "@/lib/utils";

interface Props {
  setId: string;
  items: KpiItem[];
  readonly?: boolean;
}

// ---------------------------------------------------------------------------
// Target level selector
// ---------------------------------------------------------------------------

function TargetSelector({
  selected,
  levelWeight,
  onChange,
}: {
  selected?: 1 | 2 | 3 | 4 | 5;
  levelWeight: number;
  onChange: (t: 1 | 2 | 3 | 4 | 5) => void;
}) {
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-0.5">
        {([1, 2, 3, 4, 5] as const).map((level) => {
          const isSelected = selected === level;
          const achieves = (level * levelWeight).toFixed(1);
          return (
            <button
              key={level}
              onClick={() => onChange(level)}
              title={`Level ${level} — achieves ${achieves}%`}
              className={cn(
                "grid h-6 w-6 place-items-center rounded text-[11px] font-bold transition-all",
                isSelected
                  ? "bg-brand-500 text-white shadow-sm"
                  : "bg-hover text-fg-subtle hover:bg-brand-500/15 hover:text-brand-500",
              )}
            >
              {level}
            </button>
          );
        })}
      </div>
      {selected && (
        <span className="tabular-nums text-[10px] text-fg-faint">
          T{selected} → {(selected * levelWeight).toFixed(1)}%
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline notes row
// ---------------------------------------------------------------------------

function NotesRow({
  colSpan,
  label,
  value,
  onSave,
}: {
  colSpan: number;
  label: string;
  value: string;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 pb-3 pt-0">
        <div className="rounded-md border border-brand-500/20 bg-brand-500/5 p-3">
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-brand-500/70">
            Justification / Notes — {label}
          </div>
          <textarea
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => onSave(draft)}
            placeholder="Add justification or notes to support your selected target level…"
            className="w-full resize-none rounded border border-line bg-surface px-2.5 py-1.5 text-[12px] text-fg placeholder:text-fg-faint focus:border-brand-500/40 focus:outline-none"
          />
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Shared helper: colour based on selected target level
// ---------------------------------------------------------------------------

function targetBarColor(t: number | undefined) {
  if (!t) return "";
  if (t >= 5) return "bg-emerald-500";
  if (t >= 4) return "bg-brand-500";
  if (t >= 3) return "bg-brand-500/60";
  if (t >= 2) return "bg-amber-500";
  return "bg-rose-500";
}

function targetTextColor(t: number | undefined) {
  if (!t) return "text-fg-faint";
  if (t >= 5) return "text-emerald-600 dark:text-emerald-400";
  if (t >= 4) return "text-brand-500";
  if (t >= 3) return "text-brand-500/80";
  if (t >= 2) return "text-amber-600";
  return "text-rose-600";
}

// ---------------------------------------------------------------------------
// Weight cell — parent row
// ---------------------------------------------------------------------------

function ParentWeightCell({ item }: { item: KpiItem }) {
  const levelW = perLevelWeight(item);
  const achieved = itemAchievedScore(item);
  const max = item.weightage;
  const pct = max > 0 ? Math.min(100, (achieved / max) * 100) : 0;
  // For a parent with no sub-items, colour by its own currentTarget;
  // for one with sub-items, derive a rough level from the achieved ratio.
  const t = item.subItems.length === 0
    ? item.currentTarget
    : max > 0 ? Math.round((achieved / max) * 5) as 1|2|3|4|5 : undefined;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-baseline gap-0.5 tabular-nums">
        <span className={cn("text-[13px] font-semibold", targetTextColor(t))}>
          {achieved > 0 ? achieved.toFixed(1) : "—"}
        </span>
        <span className="text-[11px] text-fg-faint">/{max}%</span>
      </div>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-hover">
        <div
          className={cn("h-full rounded-full transition-all", targetBarColor(t) || "bg-hover")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-fg-faint">{levelW.toFixed(1)}%/level</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weight cell — sub-item row
// ---------------------------------------------------------------------------

function SubWeightCell({ item, sub }: { item: KpiItem; sub: KpiSubItem }) {
  const n = item.subItems.length;
  if (n === 0) return null;
  const levelW = perSubItemLevelWeight(item);
  const subMax = levelW * 5;                                // = item.weightage / n
  const achieved = (sub.currentTarget ?? 0) * levelW;
  const pct = subMax > 0 ? Math.min(100, (achieved / subMax) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-1"
      title={`${item.weightage}% ÷ 5 levels ÷ ${n} sub-objectives = ${levelW.toFixed(1)}%/level`}
    >
      <div className="flex items-baseline gap-0.5 tabular-nums">
        <span className={cn("text-[12px] font-semibold", targetTextColor(sub.currentTarget))}>
          {achieved > 0 ? achieved.toFixed(1) : "—"}
        </span>
        <span className="text-[10px] text-fg-faint">/{subMax.toFixed(1)}%</span>
      </div>
      <div className="h-1 w-12 overflow-hidden rounded-full bg-hover">
        <div
          className={cn("h-full rounded-full transition-all", targetBarColor(sub.currentTarget) || "bg-hover")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-fg-faint">{levelW.toFixed(1)}%/level</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row action menu (⋮ dropdown)
// ---------------------------------------------------------------------------

interface ActionItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  active?: boolean;
}

function RowActionMenu({ actions }: { actions: ActionItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative flex justify-center">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "rounded p-1.5 transition-colors",
          open
            ? "bg-hover text-fg"
            : "text-fg-faint hover:bg-hover hover:text-fg",
        )}
        aria-label="Row actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[172px] overflow-hidden rounded-md border border-line bg-surface shadow-lg">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={() => {
                a.onClick();
                if (!a.active !== undefined) setOpen(false);
                else setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[12px] transition-colors",
                a.danger
                  ? "text-rose-500 hover:bg-rose-500/8"
                  : a.active
                    ? "bg-brand-500/8 text-brand-500 hover:bg-brand-500/12"
                    : "text-fg hover:bg-hover",
              )}
            >
              <span className="shrink-0">{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main table
// ---------------------------------------------------------------------------

const TARGET_KEYS = ["t1", "t2", "t3", "t4", "t5"] as const;

export function KpiTable({ setId, items, readonly }: Props) {
  const updateItem = useKpiStore((s) => s.updateItem);
  const deleteItem = useKpiStore((s) => s.deleteItem);
  const reorderItems = useKpiStore((s) => s.reorderItems);
  const updateSubItem = useKpiStore((s) => s.updateSubItem);
  const deleteSubItem = useKpiStore((s) => s.deleteSubItem);
  const confirm = useConfirm();

  const [editingItem, setEditingItem] = useState<KpiItem | null | "new">(null);
  const [editingSubItem, setEditingSubItem] = useState<{
    item: KpiItem;
    sub: KpiSubItem | null;
  } | null>(null);

  // Set of IDs whose notes row is expanded (item.id or sub.id)
  const [notesOpen, setNotesOpen] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  function toggleNotes(id: string) {
    setNotesOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDrop(targetId: string) {
    if (!dragging || dragging === targetId) {
      setDragging(null);
      setDragOver(null);
      return;
    }
    const next = [...items];
    const from = next.findIndex((i) => i.id === dragging);
    const to = next.findIndex((i) => i.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    reorderItems(setId, next);
    setDragging(null);
    setDragOver(null);
  }

  const totalCols = readonly ? 10 : 12;
  const totalWeight = items.reduce((s, i) => s + i.weightage, 0);

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[1100px] border-collapse text-[12px]">
          {/* ── Head ── */}
          <thead>
            <tr className="bg-[#1a2744] text-white">
              {!readonly && <th className="w-6 px-2 py-2.5" />}
              <th className="w-10 px-3 py-2.5 text-center text-[11px] font-semibold">
                No.
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold">
                Objectives
              </th>
              <th className="w-28 px-3 py-2.5 text-center text-[11px] font-semibold">
                Weightage (%)
              </th>
              <th className="min-w-[140px] px-3 py-2.5 text-left text-[11px] font-semibold">
                Measurable
              </th>
              {/* Target columns with shared "Target" header label on col 1 */}
              {TARGET_KEYS.map((key, i) => (
                <th
                  key={key}
                  className={cn(
                    "w-24 px-2 py-2.5 text-center text-[11px] font-semibold",
                    i === 0 && "border-l border-white/20",
                  )}
                >
                  {i === 0 ? (
                    <div>
                      <div className="text-[9px] font-normal opacity-60">
                        Target
                      </div>
                      <div>1</div>
                    </div>
                  ) : (
                    i + 1
                  )}
                </th>
              ))}
              <th className="w-36 px-3 py-2.5 text-center text-[11px] font-semibold">
                Current Target
              </th>
              {!readonly && (
                <th className="w-20 px-2 py-2.5 text-center text-[11px] font-semibold">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody>
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={totalCols}
                  className="px-4 py-12 text-center text-[12px] text-fg-faint"
                >
                  No KPI items yet. Add your first objective below.
                </td>
              </tr>
            )}

            {items.map((item, idx) => {
              const hasSubItems = item.subItems.length > 0;
              const levelW = perLevelWeight(item);
              const isOver = dragOver === item.id;

              return (
                <Fragment key={item.id}>
                  {/* ── Parent row ── */}
                  <tr
                    draggable={!readonly}
                    onDragStart={() => setDragging(item.id)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(item.id);
                    }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={() => handleDrop(item.id)}
                    className={cn(
                      "border-t border-line transition-colors",
                      idx % 2 === 0 ? "bg-surface" : "bg-subtle/40",
                      isOver &&
                        "outline outline-1 outline-brand-500/30 bg-brand-500/5",
                      dragging === item.id && "opacity-40",
                    )}
                  >
                    {!readonly && (
                      <td className="px-2 py-3 text-fg-faint">
                        <GripVertical className="h-3.5 w-3.5 cursor-grab active:cursor-grabbing" />
                      </td>
                    )}
                    <td className="px-3 py-3 text-center font-bold text-fg-muted">
                      {item.no}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-fg">
                        {item.objectives || (
                          <span className="italic text-fg-faint">
                            Untitled objective
                          </span>
                        )}
                      </div>
                      {hasSubItems && (
                        <div className="mt-1 text-[10px] text-fg-faint">
                          {item.subItems.length} sub-objective
                          {item.subItems.length !== 1 ? "s" : ""}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <ParentWeightCell item={item} />
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
                          "px-2 py-3 text-center align-top",
                          i === 0 && "border-l border-line",
                          i === 2 &&
                            "bg-brand-500/5 text-brand-600 dark:text-brand-400",
                        )}
                      >
                        <div className="whitespace-pre-line leading-relaxed text-[11px] text-fg-muted">
                          {item.targets[key]}
                        </div>
                      </td>
                    ))}
                    {/* Current Target — only on parent when no sub-items */}
                    <td className="px-3 py-3">
                      {!hasSubItems ? (
                        <TargetSelector
                          selected={item.currentTarget}
                          levelWeight={levelW}
                          onChange={(t) =>
                            updateItem(setId, item.id, { currentTarget: t })
                          }
                        />
                      ) : (
                        <div className="text-[10px] italic text-fg-faint">
                          Set per sub-objective
                        </div>
                      )}
                    </td>
                    {!readonly && (
                      <td className="px-2 py-3">
                        <RowActionMenu
                          actions={[
                            {
                              label: notesOpen.has(item.id)
                                ? "Hide notes"
                                : item.justification
                                  ? "Edit notes"
                                  : "Add notes",
                              icon: <MessageSquare className="h-3.5 w-3.5" />,
                              active: notesOpen.has(item.id),
                              onClick: () => toggleNotes(item.id),
                            },
                            {
                              label: "Edit objective",
                              icon: <Pencil className="h-3.5 w-3.5" />,
                              onClick: () => setEditingItem(item),
                            },
                            {
                              label: "Add sub-objective",
                              icon: <Plus className="h-3.5 w-3.5" />,
                              onClick: () => setEditingSubItem({ item, sub: null }),
                            },
                            {
                              label: "Delete objective",
                              icon: <Trash2 className="h-3.5 w-3.5" />,
                              danger: true,
                              onClick: async () => {
                                if (
                                  await confirm({
                                    title: "Delete objective?",
                                    message: `Remove "${item.objectives || `Item ${item.no}`}" and all its sub-objectives? Cannot be undone.`,
                                    tone: "danger",
                                    confirmLabel: "Delete",
                                  })
                                ) {
                                  deleteItem(setId, item.id);
                                }
                              },
                            },
                          ]}
                        />
                      </td>
                    )}
                  </tr>

                  {/* Notes row for parent (only when no sub-items) */}
                  {!hasSubItems && notesOpen.has(item.id) && (
                    <NotesRow
                      colSpan={totalCols}
                      label={item.objectives || `Item ${item.no}`}
                      value={item.justification ?? ""}
                      onSave={(v) =>
                        updateItem(setId, item.id, { justification: v })
                      }
                    />
                  )}

                  {/* ── Sub-item rows ── */}
                  {item.subItems.map((sub, si) => {
                    const subLevelW = perSubItemLevelWeight(item);
                    return (
                      <Fragment key={sub.id}>
                        <tr
                          className={cn(
                            "border-t border-line/50",
                            si % 2 === 0 ? "bg-subtle/60" : "bg-surface/60",
                          )}
                        >
                          {!readonly && <td />}
                          <td />
                          {/* Sub-item objectives (indented) */}
                          <td className="px-3 py-2.5 pl-7">
                            <div className="flex items-start gap-1.5">
                              <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-fg-faint" />
                              <div>
                                <div className="text-[12px] font-medium text-fg-muted">
                                  {sub.objectives || (
                                    <span className="italic text-fg-faint">
                                      Untitled sub-objective
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          {/* Calculated weight per level — reflects current target */}
                          <td className="px-3 py-2.5 text-center">
                            <SubWeightCell item={item} sub={sub} />
                          </td>
                          {/* Sub-item measurable */}
                          <td className="px-3 py-2.5 text-[11px] text-fg-subtle">
                            <div className="whitespace-pre-line leading-relaxed">
                              {sub.measurable}
                            </div>
                          </td>
                          {/* Sub-item T1-T5 */}
                          {TARGET_KEYS.map((key, i) => (
                            <td
                              key={key}
                              className={cn(
                                "px-2 py-2.5 text-center align-top",
                                i === 0 && "border-l border-line",
                                i === 2 &&
                                  "bg-brand-500/5 text-brand-600/80 dark:text-brand-400/80",
                              )}
                            >
                              <div className="whitespace-pre-line leading-relaxed text-[11px] text-fg-muted">
                                {sub.targets[key]}
                              </div>
                            </td>
                          ))}
                          {/* Sub-item target selector */}
                          <td className="px-3 py-2.5">
                            <TargetSelector
                              selected={sub.currentTarget}
                              levelWeight={subLevelW}
                              onChange={(t) =>
                                updateSubItem(setId, item.id, sub.id, {
                                  currentTarget: t,
                                })
                              }
                            />
                          </td>
                          {!readonly && (
                            <td className="px-2 py-2.5">
                              <RowActionMenu
                                actions={[
                                  {
                                    label: notesOpen.has(sub.id)
                                      ? "Hide notes"
                                      : sub.justification
                                        ? "Edit notes"
                                        : "Add notes",
                                    icon: <MessageSquare className="h-3.5 w-3.5" />,
                                    active: notesOpen.has(sub.id),
                                    onClick: () => toggleNotes(sub.id),
                                  },
                                  {
                                    label: "Edit sub-objective",
                                    icon: <Pencil className="h-3.5 w-3.5" />,
                                    onClick: () => setEditingSubItem({ item, sub }),
                                  },
                                  {
                                    label: "Delete sub-objective",
                                    icon: <Trash2 className="h-3.5 w-3.5" />,
                                    danger: true,
                                    onClick: async () => {
                                      if (
                                        await confirm({
                                          title: "Delete sub-objective?",
                                          message: `Remove "${sub.objectives || "this sub-objective"}"? Cannot be undone.`,
                                          tone: "danger",
                                          confirmLabel: "Delete",
                                        })
                                      ) {
                                        deleteSubItem(setId, item.id, sub.id);
                                      }
                                    },
                                  },
                                ]}
                              />
                            </td>
                          )}
                        </tr>

                        {/* Notes row for sub-item */}
                        {notesOpen.has(sub.id) && (
                          <NotesRow
                            colSpan={totalCols}
                            label={sub.objectives || "sub-objective"}
                            value={sub.justification ?? ""}
                            onSave={(v) =>
                              updateSubItem(setId, item.id, sub.id, {
                                justification: v,
                              })
                            }
                          />
                        )}
                      </Fragment>
                    );
                  })}

                  {/* Notes row for parent WITH sub-items (general notes on the objective) */}
                  {hasSubItems && notesOpen.has(item.id) && (
                    <NotesRow
                      colSpan={totalCols}
                      label={item.objectives || `Item ${item.no}`}
                      value={item.justification ?? ""}
                      onSave={(v) =>
                        updateItem(setId, item.id, { justification: v })
                      }
                    />
                  )}
                </Fragment>
              );
            })}
          </tbody>

          {/* ── Footer ── */}
          {items.length > 0 && (
            <tfoot>
              <tr className="border-t border-line-strong bg-subtle">
                {!readonly && <td />}
                <td />
                <td className="px-3 py-2 text-right text-[11px] font-semibold text-fg-subtle">
                  Total weightage
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1 w-10 overflow-hidden rounded-full bg-hover">
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
                  </div>
                </td>
                <td colSpan={readonly ? 7 : 8} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {!readonly && (
        <button
          onClick={() => setEditingItem("new")}
          className="inline-flex items-center gap-1.5 rounded border border-dashed border-line px-3 py-1.5 text-[12px] text-fg-subtle hover:border-brand-500/50 hover:text-brand-500"
        >
          <Plus className="h-3.5 w-3.5" />
          Add objective
        </button>
      )}

      {editingItem !== null && (
        <KpiItemModal
          setId={setId}
          item={editingItem === "new" ? null : editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}

      {editingSubItem !== null && (
        <KpiSubItemModal
          setId={setId}
          itemId={editingSubItem.item.id}
          subItem={editingSubItem.sub}
          onClose={() => setEditingSubItem(null)}
        />
      )}
    </div>
  );
}

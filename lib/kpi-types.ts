export interface KpiTargets {
  t1: string;
  t2: string;
  t3: string;
  t4: string;
  t5: string;
}

export interface KpiSubItem {
  id: string;
  objectives: string;
  measurable: string;
  targets: KpiTargets;
  currentTarget?: 1 | 2 | 3 | 4 | 5;
  justification?: string;
}

export interface KpiItem {
  id: string;
  no: number;
  objectives: string;
  /** Sub-objectives, each with their own measurable, targets, and selection */
  subItems: KpiSubItem[];
  weightage: number;
  measurable: string;
  targets: KpiTargets;
  /** Only used when subItems is empty */
  currentTarget?: 1 | 2 | 3 | 4 | 5;
  justification?: string;
}

export interface KpiSet {
  id: string;
  year: number;
  title: string;
  items: KpiItem[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Score helpers
// ---------------------------------------------------------------------------

/** Weight contributed per target level for this item (parent weightage / 5). */
export function perLevelWeight(item: KpiItem): number {
  return item.weightage / 5;
}

/**
 * Weight contributed per target level per sub-item.
 * When there are no sub-items, equals perLevelWeight.
 */
export function perSubItemLevelWeight(item: KpiItem): number {
  const n = item.subItems.length;
  if (n === 0) return perLevelWeight(item);
  return perLevelWeight(item) / n;
}

/** Achieved score for a single parent item (sum across sub-items or direct). */
export function itemAchievedScore(item: KpiItem): number {
  if (item.subItems.length === 0) {
    return ((item.currentTarget ?? 0) * item.weightage) / 5;
  }
  const w = perSubItemLevelWeight(item);
  return item.subItems.reduce(
    (sum, sub) => sum + (sub.currentTarget ?? 0) * w,
    0,
  );
}

/** Total achieved score across all items. */
export function kpiSetAchievedScore(items: KpiItem[]): number {
  return items.reduce((sum, item) => sum + itemAchievedScore(item), 0);
}

/** Count of assessed leaf nodes (items without sub-items, or sub-items). */
export function kpiAssessedCount(items: KpiItem[]): {
  assessed: number;
  total: number;
} {
  let assessed = 0;
  let total = 0;
  for (const item of items) {
    if (item.subItems.length === 0) {
      total++;
      if (item.currentTarget) assessed++;
    } else {
      for (const sub of item.subItems) {
        total++;
        if (sub.currentTarget) assessed++;
      }
    }
  }
  return { assessed, total };
}

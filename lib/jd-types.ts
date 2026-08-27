export type JdStatus = "not_started" | "in_progress" | "achieved";

export interface JdDuty {
  id: string;
  text: string;
  status: JdStatus;
  /** Free-text proof of achievement: project names, metrics, links */
  evidence?: string;
}

export interface JdResponsibility {
  id: string;
  no: number;
  title: string;
  duties: JdDuty[];
}

export interface JdModule {
  id: string;
  role: string;
  title: string;
  items: JdResponsibility[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Progress helpers — achieved counts 1, in progress counts 0.5
// ---------------------------------------------------------------------------

export function dutyScore(duty: JdDuty): number {
  if (duty.status === "achieved") return 1;
  if (duty.status === "in_progress") return 0.5;
  return 0;
}

export function responsibilityProgress(resp: JdResponsibility): number {
  if (resp.duties.length === 0) return 0;
  const score = resp.duties.reduce((sum, d) => sum + dutyScore(d), 0);
  return (score / resp.duties.length) * 100;
}

export function moduleProgress(items: JdResponsibility[]): number {
  const duties = items.flatMap((r) => r.duties);
  if (duties.length === 0) return 0;
  const score = duties.reduce((sum, d) => sum + dutyScore(d), 0);
  return (score / duties.length) * 100;
}

export function moduleCounts(items: JdResponsibility[]): {
  achieved: number;
  inProgress: number;
  total: number;
} {
  const duties = items.flatMap((r) => r.duties);
  return {
    achieved: duties.filter((d) => d.status === "achieved").length,
    inProgress: duties.filter((d) => d.status === "in_progress").length,
    total: duties.length,
  };
}

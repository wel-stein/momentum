export interface KpiTargets {
  t1: string;
  t2: string;
  t3: string;
  t4: string;
  t5: string;
}

export interface KpiItem {
  id: string;
  no: number;
  objectives: string;
  subItems: string[];
  weightage: number;
  measurable: string;
  targets: KpiTargets;
}

export interface KpiSet {
  id: string;
  year: number;
  title: string;
  items: KpiItem[];
  createdAt: string;
  updatedAt: string;
}

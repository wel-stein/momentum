import { KpiYearShell } from "@/components/kpi/KpiYearShell";

interface Props {
  params: Promise<{ year: string }>;
}

export default async function KpiYearPage({ params }: Props) {
  const { year } = await params;
  const yearNum = parseInt(year, 10);
  return <KpiYearShell year={yearNum} />;
}

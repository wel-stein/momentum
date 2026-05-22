import { redirect } from "next/navigation";
import { KpiYearShell } from "@/components/kpi/KpiYearShell";

interface Props {
  params: Promise<{ year: string }>;
}

export default async function KpiYearPage({ params }: Props) {
  const { year } = await params;
  const yearNum = parseInt(year, 10);
  if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
    redirect("/kpi");
  }
  return <KpiYearShell year={yearNum} />;
}

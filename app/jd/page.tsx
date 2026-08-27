import type { Metadata } from "next";
import { JdShell } from "@/components/jd/JdShell";

export const metadata: Metadata = {
  title: "JD readiness · Momentum",
};

export default function JdPage() {
  return <JdShell />;
}

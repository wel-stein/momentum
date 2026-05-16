import { SharedBoard } from "@/components/SharedBoard";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharedBoard token={token} />;
}

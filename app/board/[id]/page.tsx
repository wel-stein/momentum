import { BoardShell } from "@/components/BoardShell";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BoardShell boardId={id} />;
}

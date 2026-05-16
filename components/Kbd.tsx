import { cn } from "@/lib/utils";

export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex h-4 min-w-[16px] items-center justify-center rounded border border-white/10 bg-white/[0.04] px-1 font-mono text-[10px] font-medium text-zinc-400",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

"use client";

import { cn, initials } from "@/lib/utils";
import type { Member } from "@/lib/types";

interface AvatarProps {
  member: Pick<Member, "name" | "avatarColor"> & { avatarUrl?: string | null };
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  title?: string;
}

const SIZE: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-6 w-6 text-[10px]",
  md: "h-7 w-7 text-[11px]",
  lg: "h-9 w-9 text-xs",
};

export function Avatar({ member, size = "sm", className, title }: AvatarProps) {
  const cls = cn(
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white ring-2 ring-ink-850",
    SIZE[size],
    className,
  );
  if (member.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={member.avatarUrl}
        alt={member.name}
        title={title ?? member.name}
        referrerPolicy="no-referrer"
        className={cn(cls, "object-cover")}
      />
    );
  }
  return (
    <span
      title={title ?? member.name}
      style={{ backgroundColor: member.avatarColor }}
      className={cls}
    >
      {initials(member.name)}
    </span>
  );
}

export function AvatarStack({
  members,
  max = 3,
  size = "sm",
}: {
  members: (Pick<Member, "name" | "avatarColor" | "id"> & {
    avatarUrl?: string | null;
  })[];
  max?: number;
  size?: AvatarProps["size"];
}) {
  const shown = members.slice(0, max);
  const overflow = members.length - shown.length;
  return (
    <div className="flex -space-x-1.5">
      {shown.map((m) => (
        <Avatar key={m.id} member={m} size={size} />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-ink-750 text-zinc-300 font-semibold ring-2 ring-ink-850",
            SIZE[size],
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

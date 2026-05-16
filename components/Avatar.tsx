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
  xs: "h-5 w-5 text-[10px]",
  sm: "h-6 w-6 text-[11px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
};

export function Avatar({ member, size = "sm", className, title }: AvatarProps) {
  const cls = cn(
    "inline-flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-white overflow-hidden",
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
    <div className="flex -space-x-2">
      {shown.map((m) => (
        <Avatar key={m.id} member={m} size={size} />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-slate-200 text-slate-700 font-semibold ring-2 ring-white",
            SIZE[size],
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

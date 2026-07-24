import type { Priority, Status } from "./types";

export const STATUSES: Status[] = [
  { key: "not_started", label: "Not started", color: "#c4c4c4" },
  { key: "in_progress", label: "Working on it", color: "#fdab3d" },
  { key: "stuck", label: "Stuck", color: "#e2445c" },
  { key: "kiv", label: "KIV", color: "#579bfc" },
  { key: "review", label: "In review", color: "#a25ddc" },
  { key: "done", label: "Done", color: "#00c875" },
];

export const PRIORITY_META: Record<
  Priority,
  { label: string; color: string }
> = {
  low: { label: "Low", color: "#9aadbd" },
  medium: { label: "Medium", color: "#5559df" },
  high: { label: "High", color: "#ff642e" },
  critical: { label: "Critical", color: "#bb3354" },
};

export const GROUP_COLORS = [
  "#3a5dff",
  "#00c875",
  "#fdab3d",
  "#e2445c",
  "#a25ddc",
  "#0086c0",
  "#ff7575",
  "#7f5347",
];

export const AVATAR_COLORS = [
  "#3a5dff",
  "#00c875",
  "#fdab3d",
  "#e2445c",
  "#a25ddc",
  "#0086c0",
  "#ff7575",
  "#7f5347",
  "#bb3354",
  "#1f2a8b",
];

export const BOARD_EMOJIS = [
  "🚀",
  "🎯",
  "📊",
  "💡",
  "🏗️",
  "🎨",
  "📝",
  "🧪",
  "📦",
  "🔥",
  "⚡",
  "🌟",
];

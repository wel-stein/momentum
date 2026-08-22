"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Anchored dropdown panel rendered into <body> via a portal.
 *
 * Row controls live inside scroll containers (`overflow-x-auto` on the table
 * wrapper, `overflow-hidden` on the group card). An absolutely-positioned
 * panel is clipped by those ancestors, so a menu opened on the *last* row had
 * nowhere to render and became unclickable — z-index can't help, because
 * overflow clipping ignores stacking order. Portalling escapes the clip, and
 * fixed positioning against the trigger's box keeps the panel glued to it.
 */

/** Gap between the trigger and the panel. */
const GAP = 4;
/** Minimum breathing room between the panel and the viewport edges. */
const MARGIN = 8;

interface Position {
  top: number;
  left: number;
  maxHeight: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /**
   * Wrapper around the trigger. The panel is anchored to its box, and clicks
   * landing inside it never count as "outside" (so the trigger stays a toggle).
   */
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Which trigger edge the panel lines up with. */
  align?: "start" | "end";
  /** Panel classes — width, border, background, shadow. */
  className?: string;
  children: React.ReactNode;
}

// useLayoutEffect warns during SSR; the panel only ever measures in the browser.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function Popover({
  open,
  onClose,
  anchorRef,
  align = "start",
  className,
  children,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Position | null>(null);
  const [mounted, setMounted] = useState(false);

  // Keep the newest onClose without re-registering document listeners.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => setMounted(true), []);

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;

    const a = anchor.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;

    // Natural height: scrollHeight ignores the max-height we apply below, so
    // a panel that got clamped once can still grow back when it has room.
    const borders = panel.offsetHeight - panel.clientHeight;
    const height = panel.scrollHeight + borders;
    const width = panel.offsetWidth;

    const spaceBelow = vh - a.bottom - GAP - MARGIN;
    const spaceAbove = a.top - GAP - MARGIN;
    // Prefer opening downwards; flip up only when the panel doesn't fit below
    // and there is more headroom above — the last-row case.
    const flip = height > spaceBelow && spaceAbove > spaceBelow;
    const maxHeight = Math.max(flip ? spaceAbove : spaceBelow, 0);

    const top = flip
      ? Math.max(MARGIN, a.top - GAP - Math.min(height, maxHeight))
      : a.bottom + GAP;
    const left = Math.max(
      MARGIN,
      Math.min(
        align === "end" ? a.right - width : a.left,
        Math.max(MARGIN, vw - width - MARGIN),
      ),
    );

    // Bail out when nothing moved: the ResizeObserver below reacts to our own
    // style writes, and a fresh object every time would spin.
    setPos((prev) =>
      prev &&
      prev.top === top &&
      prev.left === left &&
      prev.maxHeight === maxHeight
        ? prev
        : { top, left, maxHeight },
    );
  }, [align, anchorRef]);

  // Measure before paint so the panel never flashes at the wrong spot.
  useIsomorphicLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    place();
  }, [open, place]);

  // Follow the trigger while any ancestor scrolls (capture catches scroll on
  // the table wrapper, not just the window) or the viewport resizes.
  useEffect(() => {
    if (!open) return;
    const reposition = () => place();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, place]);

  // Re-place when the panel's own content changes size — e.g. the requester
  // picker swapping its list for the "new contact" form while flipped up.
  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => place());
    ro.observe(panel);
    return () => ro.disconnect();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      onCloseRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Capture phase + stopPropagation so Esc dismisses just this panel and
      // not the surrounding modal as well.
      e.stopPropagation();
      onCloseRef.current();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, anchorRef]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        maxHeight: pos?.maxHeight,
        visibility: pos ? "visible" : "hidden",
      }}
      className={cn(
        "fixed z-[60] overflow-y-auto overflow-x-hidden overscroll-contain",
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  );
}

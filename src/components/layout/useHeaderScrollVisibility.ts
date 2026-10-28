"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/theme/ThemeProvider";

const TOP_REVEAL_DISTANCE = 80;
const DIRECTION_THRESHOLD = 10;

/** Keeps dark navigation visible on upward scroll, at the top, and during interaction.
 * Updates only a DOM attribute; scrolling never rerenders the header or its dialogs.
 */
export function useHeaderScrollVisibility(keepVisible = false) {
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const { theme } = useTheme();

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    header.removeAttribute("data-scroll-hidden");
    if (theme !== "dark" || keepVisible) return;

    let lastPosition = Math.max(0, window.scrollY);
    let frame: number | null = null;

    const reveal = () => header.setAttribute("data-scroll-hidden", "false");
    const update = () => {
      frame = null;
      const position = Math.max(0, window.scrollY);
      const delta = position - lastPosition;
      const interacting = header.matches(":focus-within") ||
        Boolean(header.querySelector('dialog[open], [aria-expanded="true"]'));

      if (position <= TOP_REVEAL_DISTANCE || interacting) {
        reveal();
        lastPosition = position;
      } else if (Math.abs(delta) >= DIRECTION_THRESHOLD) {
        header.setAttribute("data-scroll-hidden", String(delta > 0));
        lastPosition = position;
      }
    };
    const onScroll = () => {
      if (frame === null) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    header.addEventListener("focusin", reveal);
    return () => {
      window.removeEventListener("scroll", onScroll);
      header.removeEventListener("focusin", reveal);
      if (frame !== null) window.cancelAnimationFrame(frame);
      header.removeAttribute("data-scroll-hidden");
    };
  }, [pathname, theme, keepVisible]);

  return headerRef;
}

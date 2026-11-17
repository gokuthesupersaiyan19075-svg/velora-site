"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Traps Tab inside `ref` while `active`, closes on Escape and returns focus to `returnTo`. */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean, onClose: () => void, returnTo?: HTMLElement | null) {
  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    const previous = returnTo ?? (document.activeElement as HTMLElement | null);
    const first = root?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !root) return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      html.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, [active, ref, onClose, returnTo]);
}

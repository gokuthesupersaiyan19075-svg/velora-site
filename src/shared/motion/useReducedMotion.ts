"use client";

import { useSyncExternalStore } from "react";

/**
 * True when the OS asks for reduced motion, or when the URL carries ?motion=reduced
 * (lets reviewers check the reduced-motion version without changing OS settings).
 */
const QUERY = "(prefers-reduced-motion: reduce)";

function read(): boolean {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(window.location.search).get("motion") === "reduced") return true;
  return window.matchMedia(QUERY).matches;
}

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}

/** Non-hook version for GSAP setup code. */
export function prefersReducedMotion(): boolean {
  return read();
}

/**
 * Media query string for gsap.matchMedia(). When ?motion=reduced is set, returns a query that
 * never matches so the "full motion" branch is skipped.
 */
export function fullMotionQuery(): string {
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("motion") === "reduced") {
    return "(max-width: 0px)";
  }
  return "(prefers-reduced-motion: no-preference)";
}

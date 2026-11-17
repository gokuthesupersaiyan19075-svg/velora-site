"use client";

import { useSyncExternalStore } from "react";

// Per-viewer review convenience: show unapproved candidates inside the mockups (badged).
const KEY = "velora:preview-candidates";
const EVENT = "velora:preview-candidates-change";

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function usePreviewCandidates(): [boolean, (v: boolean) => void] {
  const value = useSyncExternalStore(subscribe, read, () => false);
  const set = (v: boolean) => {
    try {
      window.localStorage.setItem(KEY, v ? "1" : "0");
    } catch {
      /* storage unavailable: toggle simply does not persist */
    }
    window.dispatchEvent(new Event(EVENT));
  };
  return [value, set];
}

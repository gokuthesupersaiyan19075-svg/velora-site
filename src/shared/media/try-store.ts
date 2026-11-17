"use client";

import { useSyncExternalStore } from "react";
import type { MediaAsset } from "./types";

/**
 * "Preview on site" from the picture chooser: a per-browser override that shows one candidate in one
 * frame of the real page, without choosing it. Stored in localStorage; cleared from the preview bar.
 */
const KEY = "velora:try";
const EVENT = "velora:try-change";
export type TryState = { slot: string; asset: MediaAsset; returnTo: string } | null;

let cachedRaw: string | null = null;
let cached: TryState = null;

function read(): TryState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cached = raw ? (JSON.parse(raw) as TryState) : null;
    }
    return cached;
  } catch {
    return null;
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

export function useTry(): TryState {
  return useSyncExternalStore(subscribe, read, () => null);
}

export function setTry(state: TryState) {
  try {
    if (state) window.localStorage.setItem(KEY, JSON.stringify(state));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: preview simply does not apply */
  }
  window.dispatchEvent(new Event(EVENT));
}

"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { experienceById, experiences, parseExperiencePath, PREFERRED_KEY, type ExperienceId } from "./registry";

export const SWITCH_EVENT = "velora:switch";
export type SwitchDetail = { to: ExperienceId | "portal"; href: string };

/** Ask the shared transition layer to cover the screen, navigate, and reveal. */
export function navigateToExperience(to: ExperienceId | "portal", href: string) {
  window.dispatchEvent(new CustomEvent<SwitchDetail>(SWITCH_EVENT, { detail: { to, href } }));
}

/** Current experience + equivalent-page link to the other experience. */
export function useExperienceSwitch() {
  const pathname = usePathname() ?? "/";
  const { id, rest } = parseExperiencePath(pathname);
  const current = id ? experienceById(id) : null;
  const hrefFor = (target: ExperienceId) => `/${target}${rest}${typeof window !== "undefined" ? window.location.hash : ""}`;
  return {
    current,
    others: experiences.filter((e) => e.id !== id),
    all: experiences,
    hrefFor,
    switchTo: (target: ExperienceId) => navigateToExperience(target, hrefFor(target)),
    toPortal: () => navigateToExperience("portal", "/"),
  };
}

// ---- Preferred experience (remembered for the next visit; the portal stays reachable) ----
const PREF_EVENT = "velora:preferred-change";

export function rememberExperience(id: ExperienceId) {
  try {
    if (window.localStorage.getItem(PREFERRED_KEY) !== id) {
      window.localStorage.setItem(PREFERRED_KEY, id);
      window.dispatchEvent(new Event(PREF_EVENT));
    }
  } catch {
    /* storage blocked: nothing remembered */
  }
}

function readPreferred(): ExperienceId | null {
  try {
    const v = window.localStorage.getItem(PREFERRED_KEY);
    // Names before the Wonderverse/Thrillverse rename.
    if (v === "cinematic") return "wonderverse";
    if (v === "adrenaline") return "thrillverse";
    return v === "wonderverse" || v === "thrillverse" ? v : null;
  } catch {
    return null;
  }
}

export function usePreferredExperience(): ExperienceId | null {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(PREF_EVENT, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(PREF_EVENT, cb);
        window.removeEventListener("storage", cb);
      };
    },
    readPreferred,
    () => null,
  );
}

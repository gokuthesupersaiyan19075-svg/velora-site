"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Keeps real browser history honest across the whole site:
 * - remembers that the visitor has navigated inside the site (so Back can use history instead of the entrance);
 * - saves each page's scroll position and puts it back when the visitor returns with Back/Forward.
 */
const NAV_KEY = "velora:navigated";
const SCROLL_KEY = "velora:scroll";
let popped = false;
let lastPath: string | null = null;

/** True while a Back/Forward navigation is settling (pages use it to avoid resetting scroll). */
export const isHistoryNavigation = () => popped;

export function hasSiteHistory(): boolean {
  try {
    return sessionStorage.getItem(NAV_KEY) === "1";
  } catch {
    return false;
  }
}

function readScrolls(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(SCROLL_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveScroll(path: string, y: number) {
  try {
    const all = readScrolls();
    all[path] = Math.round(y);
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify(all));
  } catch {}
}

export function NavHistory() {
  const pathname = usePathname();

  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    const onPop = () => {
      popped = true;
    };
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (lastPath && !popped) saveScroll(lastPath, window.scrollY);
      });
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (lastPath !== null && lastPath !== pathname) {
      try {
        sessionStorage.setItem(NAV_KEY, "1");
      } catch {}
    }
    lastPath = pathname;
    if (!popped) return;
    // Back/Forward: restore where the visitor was once the page has laid out (and pins have measured).
    const y = readScrolls()[pathname] ?? 0;
    const go = () => window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
    const timers = [60, 250, 600].map((ms) => window.setTimeout(go, ms));
    const done = window.setTimeout(() => {
      popped = false;
    }, 700);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, [pathname]);

  return null;
}

"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/shared/motion/useReducedMotion";
import type { ExperienceId } from "./registry";
import { rememberExperience } from "./switching";
import { TryBar } from "@/shared/media/TryBar";
import { isHistoryNavigation } from "@/shared/navHistory";
import { MUSIC_LEVEL } from "@/shared/sound/engine";
import { useWorldSound } from "@/shared/sound/useSound";

gsap.registerPlugin(ScrollTrigger);

/**
 * Wraps every page of an experience:
 * - remembers this experience as the visitor's preference;
 * - its sound identity (voice, background bed, arrival signature) across all of its pages;
 * - smooth scrolling (Lenis) driven by GSAP's ticker so ScrollTrigger scrubs and pins stay in sync.
 *   Off for reduced motion and on touch devices (native momentum scrolling is already smooth there).
 * - resets scroll and refreshes ScrollTrigger on in-experience navigation.
 */
let lenis: Lenis | null = null;
export const getLenis = () => lenis;

export function ExperienceShell({ id, children }: { id: ExperienceId; children: ReactNode }) {
  const pathname = usePathname();
  // Each world's sound identity lasts across all of its pages.
  useWorldSound(id === "wonderverse" ? "wonder" : "thrill", id === "wonderverse" ? "music-wonder" : "music-thrill", MUSIC_LEVEL);

  useEffect(() => {
    rememberExperience(id);
  }, [id]);

  useEffect(() => {
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (prefersReducedMotion() || touch) return;
    const l = new Lenis({ lerp: 0.11, wheelMultiplier: 0.95, smoothWheel: true, syncTouch: false });
    lenis = l;
    l.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => l.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    document.documentElement.classList.add("lenis-on");
    return () => {
      gsap.ticker.remove(tick);
      l.destroy();
      lenis = null;
      document.documentElement.classList.remove("lenis-on");
    };
  }, []);

  useEffect(() => {
    // Back/Forward keeps the visitor's place (restored by NavHistory); a new page opens at its beginning.
    if (!isHistoryNavigation()) {
      if (lenis) lenis.scrollTo(0, { immediate: true });
      window.scrollTo(0, 0);
    }
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 120);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return (
    <>
      {children}
      {process.env.NODE_ENV === "development" && <TryBar />}
    </>
  );
}

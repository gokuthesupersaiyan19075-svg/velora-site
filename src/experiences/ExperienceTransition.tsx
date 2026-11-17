"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/shared/motion/useReducedMotion";
import { experienceById } from "./registry";
import { SWITCH_EVENT, type SwitchDetail } from "./switching";

/**
 * Site-wide curtain used when moving between the portal and the experiences (or between experiences).
 * It sweeps in carrying the destination's colours and name, the route changes underneath,
 * then it lifts away. The old identity never pops straight into the new one.
 * Reduced motion: a quick cross-fade instead of the sweep.
 */
type Phase = "idle" | "cover" | "hold" | "reveal";

export function ExperienceTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const [target, setTarget] = useState<SwitchDetail | null>(null);
  const fromPath = useRef<string | null>(null);

  useEffect(() => {
    const onSwitch = (e: Event) => {
      const detail = (e as CustomEvent<SwitchDetail>).detail;
      if (phase !== "idle") return;
      setTarget(detail);
      fromPath.current = window.location.pathname;
      setPhase("cover");
      const coverMs = prefersReducedMotion() ? 120 : 620;
      router.prefetch(detail.href);
      window.setTimeout(() => {
        setPhase("hold");
        router.push(detail.href, { scroll: true });
        // Safety net: if the client-side route has not changed after a few seconds (a stalled fetch on a
        // slow or flaky link), load the page normally instead of leaving the visitor on the curtain.
        window.setTimeout(() => {
          if (window.location.pathname === fromPath.current) window.location.assign(detail.href);
        }, 3500);
      }, coverMs);
    };
    window.addEventListener(SWITCH_EVENT, onSwitch);
    return () => window.removeEventListener(SWITCH_EVENT, onSwitch);
  }, [phase, router]);

  // Once the new route has rendered, lift the curtain.
  useEffect(() => {
    if (phase !== "hold" || pathname === fromPath.current) return;
    window.scrollTo(0, 0);
    // No cleanup on purpose: setPhase("reveal") re-runs this effect, and a cleanup would cancel the timer
    // that removes the curtain, leaving an invisible full-screen layer that swallows every tap and click.
    window.setTimeout(() => setPhase("reveal"), 260);
    window.setTimeout(() => {
      setPhase("idle");
      setTarget(null);
    }, 260 + (prefersReducedMotion() ? 150 : 800));
  }, [phase, pathname]);

  if (phase === "idle" || !target) return null;
  const exp = target.to === "portal" ? null : experienceById(target.to);
  const colors = exp?.colors ?? { bg: "#0E0D12", fg: "#F3F1F7", accent: "#F3F1F7" };

  return (
    <div
      className="velora-curtain"
      data-phase={phase}
      data-reduced={prefersReducedMotion() || undefined}
      style={{ ["--curtain-bg" as string]: colors.bg, ["--curtain-fg" as string]: colors.fg, ["--curtain-accent" as string]: colors.accent }}
      aria-live="polite"
    >
      <div className="velora-curtain__inner">
        <span className="velora-curtain__brand">VELORA</span>
        <span className="velora-curtain__name">{exp ? exp.name : "Choose your experience"}</span>
        {exp && <span className="velora-curtain__promise">{exp.promise}</span>}
      </div>
    </div>
  );
}

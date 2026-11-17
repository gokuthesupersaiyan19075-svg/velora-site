"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useId, useRef } from "react";
import { useReducedMotion } from "@/shared/motion/useReducedMotion";
import { getSoundEngine } from "@/shared/sound/engine";

/**
 * Hold to fill the Sunburst ring and launch. A quick click, Enter or Space launches too —
 * holding is a flourish, never a requirement.
 */
export function HoldToLaunch({
  label = "Get tickets",
  onLaunch,
  variant = "sun",
  className = "",
}: {
  label?: string;
  onLaunch: () => void;
  variant?: "sun" | "dark" | "chalk";
  className?: string;
}) {
  const reduced = useReducedMotion();
  const progress = useMotionValue(0);
  const dash = useTransform(progress, (p) => 100 - p * 100);
  const holding = useRef<ReturnType<typeof animate> | null>(null);
  const stopRiser = useRef<(() => void) | null>(null);
  const launched = useRef(false);
  const hintId = useId();

  const launch = () => {
    if (launched.current) return;
    launched.current = true;
    onLaunch();
    window.setTimeout(() => {
      launched.current = false;
      animate(progress, 0, { duration: 0.3 });
    }, 400);
  };

  const start = (e: React.PointerEvent) => {
    if (e.button !== 0 || reduced) return;
    holding.current?.stop();
    stopRiser.current?.();
    stopRiser.current = getSoundEngine().riser(0.8 * (1 - progress.get()), { volume: 0.25 }) ?? null;
    holding.current = animate(progress, 1, { duration: 0.8 * (1 - progress.get()), ease: "linear", onComplete: launch });
  };
  const cancel = () => {
    holding.current?.stop();
    if (!launched.current) {
      stopRiser.current?.();
      stopRiser.current = null;
    }
    if (!launched.current) animate(progress, 0, { duration: 0.25 });
  };

  return (
    <motion.button
      type="button"
      className={`b-launch b-launch--${variant} ${className}`}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onClick={launch}
      whileTap={reduced ? undefined : { scale: 0.95 }}
      transition={{ type: "spring", stiffness: 500, damping: 22 }}
      aria-describedby={hintId}
    >
      <svg className="b-launch-ring" viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r="15" pathLength={100} className="b-launch-track" />
        <motion.circle cx="18" cy="18" r="15" pathLength={100} className="b-launch-fill" style={{ strokeDashoffset: dash }} />
        <path d="M14 12.5v11l9-5.5z" className="b-launch-icon" />
      </svg>
      <span>{label}</span>
      <span id={hintId} hidden>
        Opens ticket information. Press, or hold to launch.
      </span>
    </motion.button>
  );
}

"use client";

import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useState } from "react";
import { useReducedMotion } from "@/shared/motion/useReducedMotion";

/**
 * Desktop-only ring that appears over [data-cursor] areas and names the action:
 * "Play"/"Pause" over video frames (clicking toggles them).
 * The system cursor always stays visible.
 */
export function CinemaCursor() {
  const reduced = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const sx = useSpring(x, { stiffness: 500, damping: 40 });
  const sy = useSpring(y, { stiffness: 500, damping: 40 });

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (min-width: 1024px)");
    const update = () => setEnabled(mq.matches && !reduced);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [reduced]);

  useEffect(() => {
    if (!enabled) return;
    function onMove(e: PointerEvent) {
      x.set(e.clientX);
      y.set(e.clientY);
      const target = (e.target as Element | null)?.closest<HTMLElement>("[data-cursor]");
      if (!target || target.closest(".a-drawer, .a-menu, a, button")) {
        setLabel(null);
        return;
      }
      const kind = target.dataset.cursor;
      if (kind === "video") {
        const v = target.querySelector("video");
        setLabel(v ? (v.paused ? "Play" : "Pause") : null);
      } else setLabel(null);
    }
    function onClick(e: MouseEvent) {
      const target = (e.target as Element | null)?.closest<HTMLElement>('[data-cursor="video"]');
      if (!target || (e.target as Element).closest("a, button")) return;
      target.querySelector<HTMLButtonElement>(".velora-pause")?.click();
      const v = target.querySelector("video");
      requestAnimationFrame(() => setLabel(v ? (v.paused ? "Play" : "Pause") : null));
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("click", onClick);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;
  return (
    <AnimatePresence>
      {label && (
        <motion.div
          className="a-cursor"
          aria-hidden="true"
          style={{ x: sx, y: sy }}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <span>{label}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

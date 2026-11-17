"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import type { ReactNode, PointerEvent, MouseEvent } from "react";
import { useReducedMotion } from "@/shared/motion/useReducedMotion";

type Props = {
  children: ReactNode;
  href?: string;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  className?: string;
  strength?: number;
};

/** Primary button that leans toward the pointer (max 10px) and springs back. */
export function MagneticButton({ children, href, onClick, className = "", strength = 10 }: Props) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.6 });

  const move = (e: PointerEvent<HTMLElement>) => {
    if (reduced || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    x.set(Math.max(-1, Math.min(1, dx)) * strength);
    y.set(Math.max(-1, Math.min(1, dy)) * strength * 0.6);
  };
  const leave = () => {
    x.set(0);
    y.set(0);
  };
  const ix = useTransform(sx, (v) => v * 0.4);
  const iy = useTransform(sy, (v) => v * 0.4);
  const cls = `a-btn a-btn--primary a-magnetic ${className}`;
  const inner = <motion.span style={{ x: ix, y: iy, display: "inline-flex" }}>{children}</motion.span>;

  return href ? (
    <motion.a href={href} className={cls} onPointerMove={move} onPointerLeave={leave} onClick={onClick} style={{ x: sx, y: sy }}>
      {inner}
    </motion.a>
  ) : (
    <motion.button type="button" className={cls} onPointerMove={move} onPointerLeave={leave} onClick={onClick} style={{ x: sx, y: sy }}>
      {inner}
    </motion.button>
  );
}

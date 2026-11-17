"use client";

import type { MouseEvent, ReactNode } from "react";
import { navigateToExperience } from "@/experiences/switching";
import { useThrillverseLink } from "./switch";

/**
 * Link into Thrillverse through the shared curtain transition. Without `to` it lands on the equivalent page;
 * with `to` (a /thrillverse/... path) it goes there.
 */
export function ThrillLink({ children = "Explore Thrillverse", className, to }: { children?: ReactNode; className?: string; to?: `/thrillverse${string}` }) {
  const link = useThrillverseLink();
  const onClick = to
    ? (e: MouseEvent<HTMLAnchorElement>) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        navigateToExperience("thrillverse", to);
      }
    : link.onClick;
  return (
    <a className={className} href={to ?? link.href} onClick={onClick}>
      {children}
    </a>
  );
}

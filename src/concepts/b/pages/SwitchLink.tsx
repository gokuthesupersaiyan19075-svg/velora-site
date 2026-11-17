"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { parseExperiencePath, type ExperienceId } from "@/experiences/registry";
import { useExperienceSwitch } from "@/experiences/switching";

/**
 * A real link to the equivalent page in the other world. A plain click runs the shared curtain
 * transition (switchTo); modified clicks (new tab, etc.) behave like any link.
 */
export function SwitchLink({ to = "wonderverse", className, children, onNavigate }: { to?: ExperienceId; className?: string; children: ReactNode; onNavigate?: () => void }) {
  const pathname = usePathname() ?? "/";
  const { rest } = parseExperiencePath(pathname);
  const { switchTo } = useExperienceSwitch();
  return (
    <a
      href={`/${to}${rest}`}
      className={className}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onNavigate?.();
        switchTo(to);
      }}
    >
      {children}
    </a>
  );
}

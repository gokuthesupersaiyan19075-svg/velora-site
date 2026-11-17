"use client";

import type { MouseEvent } from "react";
import { parseExperiencePath } from "@/experiences/registry";
import { navigateToExperience, useExperienceSwitch } from "@/experiences/switching";
import { usePathname } from "next/navigation";

/**
 * Link props for "Explore Thrillverse": runs the shared curtain transition and keeps the visitor on the
 * equivalent page. A Wonderverse ride page has no twin in Thrillverse, so it lands on Thrillverse's attractions.
 */
export function useThrillverseLink() {
  const { hrefFor, switchTo } = useExperienceSwitch();
  const { rest } = parseExperiencePath(usePathname() ?? "/");
  const ridePage = rest.startsWith("/attractions/");
  const href = ridePage ? "/thrillverse/attractions" : hrefFor("thrillverse");
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (ridePage) navigateToExperience("thrillverse", href);
    else switchTo("thrillverse");
  };
  return { href, onClick };
}

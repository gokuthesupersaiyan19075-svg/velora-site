"use client";

import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { hasSiteHistory } from "./navHistory";

/** Where Back goes when the visitor landed here directly (no earlier page of this site to return to). */
function fallbackFor(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length > 1) return "/" + parts.slice(0, -1).join("/") + "/";
  return "/?choose";
}

/**
 * Back button: returns to the page the visitor just came from (browser history, with its scroll position).
 * Only a visitor who landed on a page directly is taken one level up, or to the world selector from a world's home.
 * Each world restyles it via --back-* properties.
 */
export function BackToHub({ className = "", label = "Back" }: { className?: string; label?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const fallback = fallbackFor(pathname);

  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (hasSiteHistory() && window.history.length > 1) router.back();
    else router.push(fallback);
  }

  return (
    <a href={fallback} onClick={onClick} className={`velora-back ${className}`} aria-label="Back to the previous page">
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </a>
  );
}

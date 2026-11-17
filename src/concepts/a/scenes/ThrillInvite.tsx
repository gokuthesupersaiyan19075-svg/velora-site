"use client";

import { useExperienceSwitch } from "@/experiences/switching";

/**
 * Optional bridge to Thrillverse, placed right after the approved coaster scene (S04, unchanged).
 * Never redirects or blocks scrolling: the visitor can switch, or simply keep scrolling.
 */
export function ThrillInvite() {
  const { switchTo, hrefFor } = useExperienceSwitch();
  return (
    <aside className="a-invite" aria-label="Thrillverse">
      <div className="a-wrap a-invite-row">
        <p className="a-invite-q">Want to experience even more thrills?</p>
        <a
          className="a-btn a-btn--ghost a-btn--small"
          href={hrefFor("thrillverse")}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            switchTo("thrillverse");
          }}
        >
          Explore Thrillverse <span aria-hidden="true">→</span>
        </a>
      </div>
    </aside>
  );
}

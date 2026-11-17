"use client";

import { useEffect } from "react";
import { setTry, useTry } from "./try-store";

/** Shown while a chooser candidate is previewed on the real page: says so, scrolls to it, and offers a way back. */
export function TryBar() {
  const t = useTry();
  useEffect(() => {
    if (!t) return;
    // The frame may sit below the fold: give the page a moment to lay out, then bring it into view.
    const timer = window.setTimeout(() => {
      const el = document.querySelector(".velora-try-badge");
      el?.parentElement?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [t]);
  if (!t) return null;
  return (
    <div className="velora-trybar" role="status">
      <span>
        Previewing <strong>{t.asset.title}</strong> in this frame. It is not chosen yet.
      </span>
      <a href={t.returnTo} onClick={() => setTry(null)}>
        Back to the chooser
      </a>
      <button type="button" onClick={() => setTry(null)}>
        End preview
      </button>
    </div>
  );
}

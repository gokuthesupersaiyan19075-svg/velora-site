"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, type MouseEvent } from "react";
import { MagneticButton } from "../ui/MagneticButton";
import { useReveals } from "./reveal";

type Action = { label: string; href: string };

/** Closing call to action of an inner page, in the voice of the home finale (scene 09) but without footage. */
export function ClosingBand({ title, body, primary, secondary }: { title: string; body?: string; primary: Action; secondary?: Action }) {
  const root = useRef<HTMLElement>(null);
  const router = useRouter();
  useReveals(root);

  // MagneticButton renders a plain <a>: keep in-site navigation client-side.
  const go = (e: MouseEvent<HTMLElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    router.push(primary.href);
  };

  return (
    <section ref={root} className="a-close" aria-labelledby="a-close-h">
      <div className="a-close-glow" aria-hidden="true" />
      <div className="a-wrap a-close-inner">
        <h2 id="a-close-h" className="a-close-title a-title-card" data-reveal="words">
          {title}
        </h2>
        {body && (
          <p className="a-close-body" data-reveal="fade">
            {body}
          </p>
        )}
        <div className="a-close-ctas" data-reveal="fade">
          <MagneticButton href={primary.href} onClick={go}>
            {primary.label}
          </MagneticButton>
          {secondary && (
            <Link className="a-btn a-btn--ghost" href={secondary.href}>
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

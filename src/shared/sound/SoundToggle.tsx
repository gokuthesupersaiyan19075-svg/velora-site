"use client";

import { useSound } from "./useSound";

/**
 * Accessible sound on/off switch. Unstyled beyond structure: each experience styles `.velora-sound`
 * (or passes className). Shows animated bars while sound is on.
 */
export function SoundToggle({ className = "", labelOn = "Sound on", labelOff = "Sound off" }: { className?: string; labelOn?: string; labelOff?: string }) {
  const { enabled: saved, pending, toggle } = useSound();
  const enabled = saved && !pending;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={toggle}
      className={`velora-sound ${className}`}
      data-on={enabled || undefined}
    >
      <svg className="velora-sound__icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" />
        {enabled ? (
          <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path className="velora-sound__wave velora-sound__wave--1" d="M15.2 9.2a4 4 0 0 1 0 5.6" />
            <path className="velora-sound__wave velora-sound__wave--2" d="M17.8 6.6a7.6 7.6 0 0 1 0 10.8" />
          </g>
        ) : (
          <path d="M15.5 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        )}
      </svg>
      <span className="velora-sound__label">{pending ? "Tap for sound" : enabled ? labelOn : labelOff}</span>
    </button>
  );
}

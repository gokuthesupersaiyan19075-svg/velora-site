"use client";

import { useEffect, useRef, useState } from "react";
import { AssetSlot } from "@/shared/media/AssetSlot";
import { FrameSequence, SEQUENCES, type FrameSequenceHandle } from "@/shared/media/FrameSequence";
import { getSoundEngine } from "@/shared/sound/engine";
import { resolveSlot } from "@/shared/media/library";
import { usePreviewCandidates } from "@/shared/media/preview-store";
import { fullMotionQuery, useReducedMotion } from "@/shared/motion/useReducedMotion";
import { conditions, gsap, useGSAP, type Conditions } from "../gsap";
import { slotsB } from "../slots";
import { attraction } from "@/park/content";

const POV_IDS = new Set(["pexels-40268711", "pexels-40268519"]);
const WORDS = ["Climb", "Wait", "Drop", "Turn", "Scream", "Again"];
// The finish card after the ride: the coaster shown in the POV footage, then the next scene's adventures.
const RODE = attraction("skyline-serpent")!;
const NEXT_UP = [attraction("summit-challenge")!, attraction("breaker-bay")!];
const LANES = ["left", "centre", "right"] as const;

/** Speed ramp: the climb is slow, the drop is fast, the brake is slow. p ∈ [0,1] → share of the clip. */
function ramp(p: number) {
  if (p < 0.25) return (p / 0.25) * 0.1;
  if (p < 0.75) return 0.1 + ((p - 0.25) / 0.5) * 0.8;
  return 0.9 + ((p - 0.75) / 0.25) * 0.1;
}

/**
 * Scene 04, the signature. The visitor's scroll is the throttle: scroll progress drives the clip's
 * currentTime. With approved coaster POV it is one continuous ride; otherwise it is an honest
 * three-cut sequence of the approved clips (no fake POV).
 */
export function Thrill() {
  const root = useRef<HTMLElement>(null);
  const v0 = useRef<HTMLVideoElement | null>(null);
  const v1 = useRef<HTMLVideoElement | null>(null);
  const v2 = useRef<HTMLVideoElement | null>(null);
  const [preview] = usePreviewCandidates();
  const reduced = useReducedMotion();
  const [saveData, setSaveData] = useState(false);
  const povAsset = resolveSlot(slotsB.thrill, preview).asset;
  const continuous = POV_IDS.has(povAsset?.id ?? "");
  const scrub = !reduced && !saveData;
  // The POV ride is drawn from pre-rendered 1920 px frames (smooth at any scroll speed) when available.
  const seqId = scrub && continuous && povAsset && SEQUENCES[povAsset.id] ? povAsset.id : null;
  const seq = useRef<FrameSequenceHandle | null>(null);

  useEffect(() => {
    const c = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the browser after mount
    if (c?.saveData) setSaveData(true);
  }, []);

  useGSAP(
    () => {
      if (!scrub) return;
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();
      mm.add(conditions(fullMotionQuery()), (ctx) => {
        const { motion, mobile } = ctx.conditions as Conditions;
        if (!motion) return;
        const el = root.current!;
        el.dataset.mode = "pin";
        const videos = continuous ? [v0.current] : [v0.current, v1.current, v2.current];
        const segs = videos.length;
        const target = videos.map(() => 0);
        const shown = videos.map(() => 0);

        // ease the seek so it feels like inertia rather than a scrubber
        const tick = () => {
          // Frame-rate independent easing: the same glide at 60, 120 or a dropped 30 fps, so it never lurches.
          const k = 1 - Math.pow(1 - 0.085, Math.min(3, gsap.ticker.deltaRatio()));
          if (seqId) {
            shown[0] += (target[0] - shown[0]) * k;
            seq.current?.show(shown[0]);
            return;
          }
          videos.forEach((v, i) => {
            if (!v || !v.duration || Number.isNaN(v.duration)) return;
            shown[i] += (target[i] - shown[i]) * k;
            const t = shown[i] * (v.duration - 0.05);
            if (Math.abs(v.currentTime - t) > 0.016) v.currentTime = t;
          });
        };
        gsap.ticker.add(tick);
        if (!seqId) videos.forEach((v) => v?.load());

        // Ride sound: chain lift while climbing, the run at the drop, one scream just after it.
        const engine = getSoundEngine();
        let dropped = false;
        let screamed = false;
        const rideSound = (p: number, active: boolean) => {
          engine.layer("lift", active && p > 0.01 && p < 0.25 ? "chain-lift" : null, 0.32);
          if (p < 0.2) {
            dropped = false;
            screamed = false;
          }
          if (active && !dropped && p >= 0.25) {
            dropped = true;
            engine.sfx("coaster-run", { volume: 0.42 });
          }
          if (active && !screamed && p >= 0.3) {
            screamed = true;
            engine.sfx("ride-scream", { volume: 0.26 });
          }
        };

        // The ride is a short, deliberate stretch: a measured stretch, long enough to read each word and follow the ride.
        const len = mobile ? 210 : 320;
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: `+=${len}%`,
            pin: true,
            scrub: true,
            anticipatePin: 1,
            onToggle: (self) => {
              const host = el.closest(".concept-b-root") as HTMLElement | null;
              if (host) host.dataset.thrill = self.isActive ? "on" : "off";
              rideSound(self.progress, self.isActive);
            },
            onUpdate: (self) => {
              const p = self.progress;
              rideSound(p, self.isActive);
              if (continuous) target[0] = ramp(p);
              else
                videos.forEach((_, i) => {
                  const local = gsap.utils.clamp(0, 1, p * segs - i);
                  target[i] = ramp(local);
                });
            },
          },
        });

        // frame scale: settle during the climb, rush at the drop
        tl.fromTo(q(".b-thrill-frame"), { scale: 1.1 }, { scale: 1, duration: 0.25 }, 0).to(q(".b-thrill-frame"), { scale: 1.15, duration: 0.5, ease: "power1.in" }, 0.25).to(
          q(".b-thrill-frame"),
          { scale: 1.02, duration: 0.25, ease: "power2.out" },
          0.75,
        );
        // banked turns: a small roll on the curve sections
        tl.to(q(".b-thrill-roll"), { rotate: 2, duration: 0.08 }, 0.42).to(q(".b-thrill-roll"), { rotate: -2, duration: 0.12 }, 0.55).to(q(".b-thrill-roll"), { rotate: 0, duration: 0.08 }, 0.7);

        if (!continuous) {
          // diagonal wipes between the three cuts
          tl.fromTo(q(".b-thrill-cut--2"), { clipPath: "polygon(0 0, 0 0, -14% 100%, -14% 100%)" }, { clipPath: "polygon(0 0, 114% 0, 100% 100%, -14% 100%)", duration: 0.04, ease: "power4.inOut" }, 1 / 3 - 0.02);
          tl.fromTo(q(".b-thrill-cut--3"), { clipPath: "polygon(114% 0, 114% 0, 100% 100%, 100% 100%)" }, { clipPath: "polygon(-14% 0, 114% 0, 100% 100%, -14% 100%)", duration: 0.04, ease: "power4.inOut" }, 2 / 3 - 0.02);
        }

        // words fly from deep in the screen past the camera, one lane at a time
        const words = q(".b-thrill-word");
        words.forEach((w, i) => {
          const at = 0.04 + i * 0.145;
          tl.fromTo(w, { z: -600, autoAlpha: 0 }, { z: -100, autoAlpha: 1, duration: 0.07, ease: "power2.out" }, at).to(
            w,
            { z: 200, autoAlpha: 0, duration: 0.07, ease: "power2.in" },
            at + 0.08,
          );
        });

        // the end: a flash-free Flare Pink wipe clears the frame toward the bright family scene
        tl.fromTo(q(".b-thrill-wipe"), { clipPath: "polygon(0 0, 0 0, -14% 100%, -14% 100%)" }, { clipPath: "polygon(0 0, 114% 0, 100% 100%, -14% 100%)", duration: 0.06, ease: "power3.inOut" }, 0.93)
          .fromTo(q(".b-wipe-card > *"), { x: -60, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.03, stagger: 0.008, ease: "power3.out" }, 0.955);

        return () => {
          gsap.ticker.remove(tick);
          engine.layer("lift", null);
          delete el.dataset.mode;
          const host = el.closest(".concept-b-root") as HTMLElement | null;
          if (host) host.dataset.thrill = "off";
        };
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [scrub, continuous, seqId], revertOnUpdate: true },
  );

  const skip = () => {
    const next = document.getElementById("family");
    if (!next) return;
    window.scrollTo({ top: next.getBoundingClientRect().top + window.scrollY, behavior: reduced ? "auto" : "smooth" });
    next.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
  };

  const playback = scrub ? "scrub" : "still";
  return (
    <section id="thrill" ref={root} className="b-thrill" data-continuous={continuous} aria-labelledby="b-thrill-h">
      <h2 id="b-thrill-h" className="b-visually-hidden">
        The ride: scroll to drive it
      </h2>
      <div className="b-thrill-stage">
        <div className="b-thrill-roll">
          <div className="b-thrill-frame">
            <div className="b-thrill-cut b-thrill-cut--1">
              {seqId ? (
                <FrameSequence ref={seq} id={seqId} poster={povAsset?.web.poster} />
              ) : (
                <AssetSlot ref={v0} slot={slotsB.thrill} playback={playback} placeholderClassName="b-ph" alt="" />
              )}
            </div>
            {!continuous && (
              <>
                <div className="b-thrill-cut b-thrill-cut--2">
                  <AssetSlot ref={v1} slot={slotsB.thrillCut1} playback={playback} placeholderClassName="b-ph" alt="" />
                </div>
                <div className="b-thrill-cut b-thrill-cut--3">
                  <AssetSlot ref={v2} slot={slotsB.thrillCut2} playback={playback} placeholderClassName="b-ph" alt="" />
                </div>
              </>
            )}
          </div>
        </div>
        <div className="b-thrill-lines" aria-hidden="true" />
        <ol className="b-thrill-words" aria-label="The ride, in six words">
          {WORDS.map((w, i) => (
            <li key={w} className={`b-thrill-word b-thrill-word--${LANES[i % 3]}`}>
              <span className="b-kin">{w}</span>
            </li>
          ))}
        </ol>
        <div className="b-thrill-wipe" aria-hidden="true">
          <div className="b-wipe-card">
            <p className="b-wipe-tag">You just rode</p>
            <p className="b-wipe-name b-kin">{RODE.name}</p>
            <p className="b-wipe-facts">
              <span>{RODE.facts.minHeightCm} cm minimum</span>
              <span>{RODE.facts.durationMin} minutes</span>
              <span>{RODE.type}</span>
            </p>
            <p className="b-wipe-next">
              Next up: {NEXT_UP.map((a) => a.name).join(" and ")}
              <svg viewBox="0 0 20 20" width="22" height="22" aria-hidden="true">
                <path d="M10 3v13M4.5 11 10 16.5 15.5 11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </p>
          </div>
        </div>
        <button type="button" className="b-btn b-skip" onClick={skip}>
          Skip the ride
        </button>
      </div>
    </section>
  );
}

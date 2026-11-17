"use client";

import { useRef, useState } from "react";
import { AssetSlot } from "@/shared/media/AssetSlot";
import type { MediaSlot } from "@/shared/media/types";
import { fullMotionQuery } from "@/shared/motion/useReducedMotion";
import { gsap, useGSAP } from "../gsap";
import { slotsB } from "../slots";
import { attraction, venue } from "@/park/content";

type Cat = "eat" | "watch" | "splash";
// Category ids stay as styling hooks; the Thrillverse words are Fuel / Ride / Surf.
const ITEMS: { slot: MediaSlot; cat: Cat; area: string; label: string; href?: string }[] = [
  { slot: slotsB.food1, cat: "eat", area: "f1", label: `${venue("midway-kitchen")!.name}: ${venue("midway-kitchen")!.line.toLowerCase()}` },
  { slot: slotsB.food2, cat: "eat", area: "f2", label: "Treats, shows and parades are in Wonderverse →", href: "/wonderverse" },
  { slot: slotsB.show1, cat: "watch", area: "s1", label: `${attraction("summit-challenge")!.name}: zip line over Thrill Heights` },
  { slot: slotsB.show2, cat: "watch", area: "s2", label: `${attraction("vortex")!.name} after dark` },
  { slot: slotsB.show3, cat: "watch", area: "s3", label: `${attraction("velocity-ridge")!.name}: airtime on every hill` },
  { slot: slotsB.splash, cat: "splash", area: "w1", label: `${attraction("breaker-bay")!.name}: ${attraction("breaker-bay")!.line.toLowerCase()}` },
];
const WORDS: { cat: Cat; word: string }[] = [
  { cat: "eat", word: "Fuel" },
  { cat: "watch", word: "Ride" },
  { cat: "splash", word: "Surf" },
];

/** Scene 06: a rhythmic editorial grid; outline category words fill when their frames are hovered or focused. */
export function Grid() {
  const root = useRef<HTMLElement>(null);
  const [hot, setHot] = useState<Cat | null>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();
      mm.add(fullMotionQuery(), () => {
        // beat pattern: 1-2, 1-2-3
        const beats = [0, 0.14, 0.42, 0.56, 0.7, 0.98];
        q(".b-grid-item").forEach((el, i) => {
          gsap.fromTo(el, { clipPath: "polygon(0% 0%, 0% 0%, -14% 100%, -14% 100%)" }, {
            clipPath: "polygon(0% 0%, 114% 0%, 100% 100%, -14% 100%)",
            clearProps: "clipPath",
            duration: 0.5,
            ease: "power4.out",
            delay: beats[i] ?? 0,
            scrollTrigger: { trigger: q(".b-grid")[0], start: "top 70%" },
          });
        });
        q(".b-grid-word").forEach((w, i) => {
          gsap.fromTo(w, { xPercent: i % 2 ? -20 : 20 }, { xPercent: i % 2 ? 20 : -20, ease: "none", scrollTrigger: { trigger: w, start: "top bottom", end: "bottom top", scrub: true } });
        });
        // the ground darkens into night as the section leaves
        gsap.to(root.current, { backgroundColor: "#0D0B4A", ease: "none", scrollTrigger: { trigger: root.current, start: "bottom 90%", end: "bottom top", scrub: true } });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section id="eat" ref={root} className="b-gridsec" aria-labelledby="b-grid-h">
      <div className="b-grid-head">
        <h2 id="b-grid-h" className="b-grid-title b-kin">
          Between the rides
        </h2>
        <p>Refuel, ride again, hit the waves. Midway Kitchen serves from 11:00 to 21:00.</p>
      </div>
      <div className="b-grid" data-hot={hot ?? undefined}>
        {WORDS.map((w) => (
          <p key={w.cat} className={`b-grid-word b-grid-word--${w.cat} b-kin`} data-on={hot === w.cat} aria-hidden="true">
            {w.word}
          </p>
        ))}
        {ITEMS.map((it) => (
          <div
            key={it.slot.id}
            className={`b-grid-item b-grid-item--${it.area}`}
            data-on={hot === it.cat}
            onPointerEnter={() => setHot(it.cat)}
            onPointerLeave={() => setHot(null)}
            onFocusCapture={() => setHot(it.cat)}
            onBlurCapture={() => setHot(null)}
          >
            <AssetSlot slot={it.slot} playback="hover" controlClassName="b-pause" playbackPriority={hot === it.cat ? 4 : 1} placeholderClassName="b-ph" sizes="(min-width: 768px) 40vw, 100vw" alt="" />
            <a href={it.href ?? "#visit"} className="b-grid-link">
              {it.label}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

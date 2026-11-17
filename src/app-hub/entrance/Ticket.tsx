"use client";

/**
 * Entrance variation 2, "The Ticket": one oversized double pass, a stub per world, joined at a perforation.
 * Pull a stub away (drag) or tap it to tear it off; the torn pass slides to the centre and its world fills the screen.
 * The card tilts in CSS 3D and its foil follows the pointer; everything moves with transforms and opacity only.
 */
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { prefersReducedMotion } from "@/shared/motion/useReducedMotion";
import { getSoundEngine } from "@/shared/sound/engine";
import { gsap, SplitText, useGSAP } from "./gsap";
import {
  chimeFor,
  EnterLink,
  EntranceBar,
  EntranceFoot,
  enterWorld,
  mediaAsset,
  other,
  SkipIntro,
  THRILL,
  useEntranceSound,
  useFinePointer,
  useSideBySide,
  useSkipOnInput,
  WONDER,
  world,
  WORLD_LINE,
  WORLD_MEDIA,
  worldVars,
  WorldVideo,
  type ExperienceId,
} from "./shared";

type Drag = { id: ExperienceId; x0: number; y0: number; t0: number; pull: number; moved: boolean };

export function Ticket() {
  useEntranceSound();
  const sideBySide = useSideBySide();
  const fine = useFinePointer();
  const [lean, setLean] = useState<ExperienceId | null>(null);
  const [torn, setTorn] = useState<ExperienceId | null>(null);
  const [paused, setPaused] = useState(false);
  const [intro, setIntro] = useState(true);

  const root = useRef<HTMLDivElement>(null);
  const ticket = useRef<HTMLDivElement>(null);
  const perf = useRef<HTMLSpanElement>(null);
  const stubW = useRef<HTMLElement>(null);
  const stubT = useRef<HTMLElement>(null);
  const edgeW = useRef<HTMLSpanElement>(null);
  const edgeT = useRef<HTMLSpanElement>(null);
  const introTl = useRef<gsap.core.Timeline | null>(null);
  const tornRef = useRef<ExperienceId | null>(null);
  const drag = useRef<Drag | null>(null);
  const axisX = useRef(true);
  const tilt = useRef<{ rx: (v: number) => void; ry: (v: number) => void; fx: ((v: number) => void)[]; fy: ((v: number) => void)[] } | null>(null);

  useEffect(() => {
    axisX.current = sideBySide;
  }, [sideBySide]);

  const stubOf = (id: ExperienceId) => (id === WONDER ? stubW.current : stubT.current);
  const edgeOf = (id: ExperienceId) => (id === WONDER ? edgeW.current : edgeT.current);

  // ---------- opening + tilt ----------
  useGSAP(
    () => {
      // Server HTML keeps the scene hidden until the opening has set its first frame (no flash).
      root.current?.setAttribute("data-ready", "");
      const q = gsap.utils.selector(root);
      if (!prefersReducedMotion()) {
        const ry = gsap.quickTo(ticket.current, "rotationY", { duration: 0.9, ease: "power3.out" });
        const rx = gsap.quickTo(ticket.current, "rotationX", { duration: 0.9, ease: "power3.out" });
        const foils = q(".ent-tk-foil-sheet");
        tilt.current = {
          rx,
          ry,
          fx: foils.map((f) => gsap.quickTo(f, "xPercent", { duration: 1.1, ease: "power3.out" })),
          fy: foils.map((f) => gsap.quickTo(f, "yPercent", { duration: 1.1, ease: "power3.out" })),
        };
      }
      if (prefersReducedMotion()) {
        setIntro(false);
        return;
      }
      const names = SplitText.create(q(".ent-tk-name"), { type: "chars", mask: "chars" });
      const title = SplitText.create(q(".ent-tk-title"), { type: "words", mask: "words" });
      const tl = gsap.timeline({ defaults: { ease: "expo.out" }, onComplete: () => setIntro(false) });
      tl.from(q(".ent-tk-back"), { opacity: 0, duration: 1.2, ease: "power1.out" }, 0)
        .from(title.words, { yPercent: 110, duration: 0.9, stagger: 0.04 }, 0.15)
        .from(q(".ent-tk-rise"), { y: () => window.innerHeight * 0.7, rotationX: 58, opacity: 0, duration: 1.4 }, 0.25)
        .from(names.chars, { yPercent: 115, duration: 0.85, stagger: 0.022 }, 0.75)
        .from(q(".ent-tk-reveal"), { y: 14, opacity: 0, duration: 0.7, stagger: 0.045 }, 0.9)
        .fromTo(q(".ent-tk-glare"), { xPercent: -140 }, { xPercent: 140, duration: 1.2, ease: "power2.inOut", clearProps: "transform" }, 1.0)
        .from(q(".ent-tk-hint"), { opacity: 0, duration: 0.6, ease: "power1.out" }, 1.6);
      introTl.current = tl;
    },
    { scope: root },
  );

  const skip = useCallback(() => introTl.current?.progress(1), []);
  useSkipOnInput(intro, skip);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const t = tilt.current;
    if (!t || e.pointerType !== "mouse") return;
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    t.ry(nx * 9);
    t.rx(-ny * 7);
    t.fx.forEach((f) => f(-nx * 22));
    t.fy.forEach((f) => f(-ny * 14));
  };
  const onLeave = () => {
    const t = tilt.current;
    if (t) {
      t.ry(0);
      t.rx(0);
      t.fx.forEach((f) => f(0));
      t.fy.forEach((f) => f(0));
    }
    if (!drag.current) setLean(tornRef.current);
  };

  // ---------- tearing ----------
  const tear = (id: ExperienceId) => {
      if (tornRef.current) return;
      tornRef.current = id;
      setTorn(id);
      setLean(id);
      getSoundEngine().tick({ volume: 0.14, freq: 1400 });
      const stub = stubOf(id);
      const rest = stubOf(other(id));
      if (!stub || !rest) return;
      const x = axisX.current;
      const toCentre = id === WONDER ? 1 : -1;
      const half = (x ? stub.offsetWidth : stub.offsetHeight) / 2;
      const home = x ? { x: toCentre * half, y: 0 } : { x: 0, y: toCentre * half };
      gsap.killTweensOf([stub, rest]);
      if (prefersReducedMotion()) {
        gsap.set(stub, { ...home, rotation: 0, scale: 1 });
        gsap.set(rest, { autoAlpha: 0 });
        gsap.set(perf.current, { opacity: 0 });
        gsap.set(edgeOf(id), { opacity: 1 });
        return;
      }
      gsap
        .timeline()
        .to(perf.current, { opacity: 0, duration: 0.2 }, 0)
        .to(stub, { rotation: -toCentre * 6, duration: 0.14, ease: "power2.out" }, 0)
        .to(edgeOf(id), { opacity: 1, duration: 0.25 }, 0.08)
        .to(rest, { y: x ? 160 : toCentre * -60, x: x ? toCentre * -40 : 0, rotation: -toCentre * 11, autoAlpha: 0, duration: 0.7, ease: "power3.in" }, 0.06)
        .to(stub, { ...home, rotation: 0, scale: 1.035, duration: 1.05, ease: "expo.out" }, 0.16);
  };

  const chooseAgain = () => {
    const id = tornRef.current;
    if (!id) return;
    tornRef.current = null;
    setTorn(null);
    setLean(null);
    const stubs = [stubW.current, stubT.current];
    const edges = [edgeW.current, edgeT.current];
    gsap.killTweensOf(stubs);
    const d = prefersReducedMotion() ? 0 : 0.85;
    gsap.to(stubs, { x: 0, y: 0, rotation: 0, scale: 1, autoAlpha: 1, duration: d, ease: "expo.out" });
    gsap.to(edges, { opacity: 0, duration: d * 0.5 });
    gsap.to(perf.current, { opacity: 1, duration: d * 0.6, delay: d * 0.4 });
  };

  // Escape puts the torn pass back.
  useEffect(() => {
    if (!torn) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") chooseAgain();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const enter = (id: ExperienceId) => {
    if (prefersReducedMotion()) return enterWorld(id);
    if (tornRef.current !== id) {
      if (tornRef.current) chooseAgain();
      tear(id);
      window.setTimeout(() => enterWorld(id), 560);
      return;
    }
    const stub = stubOf(id);
    if (stub) gsap.fromTo(stub, { scale: 1.07 }, { scale: 1.035, duration: 0.5, ease: "power3.out" });
    enterWorld(id);
  };

  // ---------- drag / tap ----------
  const threshold = (stub: HTMLElement) => Math.min(150, (axisX.current ? stub.offsetWidth : stub.offsetHeight) * 0.3);

  const onStubDown = (id: ExperienceId, e: PointerEvent<HTMLElement>) => {
    if (tornRef.current || intro || e.button !== 0) return;
    if ((e.target as Element).closest("a, button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id, x0: e.clientX, y0: e.clientY, t0: performance.now(), pull: 0, moved: false };
    setLean(id);
  };

  const onStubMove = (id: ExperienceId, e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.id !== id) return;
    const stub = e.currentTarget;
    const x = axisX.current;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (Math.hypot(dx, dy) > 6) d.moved = true;
    const along = x ? dx : dy;
    const out = id === WONDER ? -along : along; // away from the perforation
    const pull = Math.max(0, out);
    const shown = pull > 0 ? pull : out * 0.12; // pushing inward barely moves it
    const sign = id === WONDER ? -1 : 1;
    if (!prefersReducedMotion()) {
      gsap.set(stub, x ? { x: sign * shown * 0.7, rotation: sign * Math.min(pull / 16, 8) } : { y: sign * shown * 0.7, rotation: -sign * Math.min(pull / 24, 5) });
    }
    d.pull = pull;
    if (pull > threshold(stub)) {
      drag.current = null;
      tear(id);
    }
  };

  const onStubUp = (id: ExperienceId, e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== id) return;
    if (!d.moved && performance.now() - d.t0 < 600) {
      tear(id);
      return;
    }
    gsap.to(e.currentTarget, { x: 0, y: 0, rotation: 0, duration: prefersReducedMotion() ? 0 : 0.9, ease: "elastic.out(1, 0.45)" });
    if (!fine) setLean(null);
  };

  const hover = (id: ExperienceId) => {
    if (tornRef.current || drag.current || !fine) return;
    setLean(id);
    chimeFor(id);
  };

  return (
    <div
      ref={root}
      className="ent ent-ticket"
      data-axis={sideBySide ? "x" : "y"}
      data-lean={lean ?? undefined}
      data-torn={torn ?? undefined}
      data-intro={intro || undefined}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div className="ent-tk-back" aria-hidden="true">
        <div className="ent-tk-split">
          {[WONDER, THRILL].map((id) => (
            <div key={id} className={`ent-tk-split-half ent-tk-split-half--${id === WONDER ? "w" : "t"}`}>
              <Image src={mediaAsset(WORLD_MEDIA[id].hero).web.poster} alt="" fill sizes="(min-aspect-ratio: 1/1) 50vw, 100vw" quality={70} priority />
            </div>
          ))}
        </div>
        {[WONDER, THRILL].map((id) => (
          <div key={id} className={`ent-tk-full ent-tk-full--${id === WONDER ? "w" : "t"}`}>
            <WorldVideo asset={mediaAsset(WORLD_MEDIA[id].hero)} active={!intro && lean === id} paused={paused} className="ent-tk-video" />
          </div>
        ))}
        <span className="ent-tk-scrim" />
      </div>

      <EntranceBar paused={paused} onTogglePause={() => setPaused((p) => !p)} className="ent-tk-bar" />

      <main className="ent-tk-stage">
        <h1 className="ent-tk-title">Two worlds, one park. Tear off the pass you want.</h1>

        <div className="ent-tk-scene">
          <div className="ent-tk-rise">
            <div ref={ticket} className="ent-tk-ticket">
              <Stub
                id={WONDER}
                stubRef={stubW}
                edgeRef={edgeW}
                torn={torn}
                onDown={onStubDown}
                onMove={onStubMove}
                onUp={onStubUp}
                onHover={hover}
                onFocusEnter={() => !tornRef.current && setLean(WONDER)}
                onEnter={enter}
              />
              <span ref={perf} className="ent-tk-perf" aria-hidden="true" />
              <Stub
                id={THRILL}
                stubRef={stubT}
                edgeRef={edgeT}
                torn={torn}
                onDown={onStubDown}
                onMove={onStubMove}
                onUp={onStubUp}
                onHover={hover}
                onFocusEnter={() => !tornRef.current && setLean(THRILL)}
                onEnter={enter}
              />
            </div>
          </div>
        </div>

        <div className="ent-tk-after">
          {torn ? (
            <button type="button" className="ent-chip ent-tk-again" onClick={chooseAgain}>
              <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                <path d="M4 10a6 6 0 1 0 1.8-4.3M4 3.5v3.2h3.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Choose again</span>
            </button>
          ) : (
            <p className="ent-tk-hint">
              <span className="ent-tk-hint-fine">Pull a pass away from the perforation to tear it off</span>
              <span className="ent-tk-hint-touch">Tap a pass to tear it off</span>
            </p>
          )}
        </div>
      </main>

      <EntranceFoot className="ent-tk-foot" />
      <SkipIntro hidden={!intro} onSkip={skip} />
    </div>
  );
}

function Stub({
  id,
  stubRef,
  edgeRef,
  torn,
  onDown,
  onMove,
  onUp,
  onHover,
  onFocusEnter,
  onEnter,
}: {
  id: ExperienceId;
  stubRef: RefObject<HTMLElement | null>;
  edgeRef: RefObject<HTMLSpanElement | null>;
  torn: ExperienceId | null;
  onDown: (id: ExperienceId, e: PointerEvent<HTMLElement>) => void;
  onMove: (id: ExperienceId, e: PointerEvent<HTMLElement>) => void;
  onUp: (id: ExperienceId, e: PointerEvent<HTMLElement>) => void;
  onHover: (id: ExperienceId) => void;
  onFocusEnter: () => void;
  onEnter: (id: ExperienceId) => void;
}) {
  const w = world(id);
  const key = id === WONDER ? "w" : "t";
  const photo = mediaAsset(WORLD_MEDIA[id].extras[0]);
  const gone = torn !== null && torn !== id;
  return (
    <article
      ref={stubRef}
      className={`ent-tk-stub ent-tk-stub--${key}`}
      style={worldVars(id)}
      aria-labelledby={`ent-tk-name-${key}`}
      inert={gone}
      data-torn={torn === id || undefined}
      onPointerDown={(e) => onDown(id, e)}
      onPointerMove={(e) => onMove(id, e)}
      onPointerUp={(e) => onUp(id, e)}
      onPointerCancel={(e) => onUp(id, e)}
      onPointerEnter={() => onHover(id)}
    >
      <div className="ent-tk-face">
        <div className="ent-tk-photo">
          <Image src={photo.web.poster} alt="" fill sizes="(min-aspect-ratio: 1/1) 44vw, 92vw" quality={80} />
        </div>
        <div className="ent-tk-copy">
          <p className="ent-tk-kicker ent-tk-reveal">
            <span>VELORA</span>
            <span>World pass</span>
          </p>
          <h2 id={`ent-tk-name-${key}`} className="ent-tk-name">
            {w.name}
          </h2>
          <p className="ent-tk-promise ent-tk-reveal">{w.promise}</p>
          <p className="ent-tk-line ent-tk-reveal">{WORLD_LINE[id]}</p>
          <div className="ent-tk-actions ent-tk-reveal">
            <EnterLink id={id} onEnter={() => onEnter(id)} onFocus={onFocusEnter} className="ent-tk-enter" />
          </div>
        </div>
        <span className="ent-tk-code" aria-hidden="true" />
        <span className="ent-tk-foil" aria-hidden="true">
          <i className="ent-tk-foil-sheet" />
        </span>
        <span className="ent-tk-glare" aria-hidden="true" />
      </div>
      <span ref={edgeRef} className="ent-tk-edge" aria-hidden="true" />
    </article>
  );
}

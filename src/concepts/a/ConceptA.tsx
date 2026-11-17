"use client";

import { useCallback, useEffect, useState } from "react";
import { BackToHub } from "@/shared/BackToHub";
import { setPlaybackLimit } from "@/shared/media/playback";
import { ScrollTrigger } from "./lib/gsap";
import { S01Opening } from "./scenes/S01Opening";
import { S02Wonder } from "./scenes/S02Wonder";
import { S03Attractions } from "./scenes/S03Attractions";
import { S04Adrenaline } from "./scenes/S04Adrenaline";
import { ThrillInvite } from "./scenes/ThrillInvite";
import { WonderSounds } from "./scenes/WonderSounds";
import { S05Everyone } from "./scenes/S05Everyone";
import { S06Beyond } from "./scenes/S06Beyond";
import { S07AfterDark } from "./scenes/S07AfterDark";
import { S08Visit } from "./scenes/S08Visit";
import { S09Final } from "./scenes/S09Final";
import { CinemaCursor } from "./ui/CinemaCursor";
import { TICKETS, UIContext, type DrawerContent } from "./ui/context";
import { Drawer } from "./ui/Drawer";
import { Footer } from "./ui/Footer";
import { Nav } from "./ui/Nav";

/** Concept A — Wonderverse. See ./storyboard.ts for the scene-by-scene spec. */
export function ConceptA() {
  const [scene, setScene] = useState("01");
  const [drawer, setDrawer] = useState<{ content: DrawerContent; opener: HTMLElement | null } | null>(null);

  // Which scene is under the middle of the viewport drives the timecode and nav mode.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".concept-a [data-scene]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setScene((e.target as HTMLElement).dataset.scene ?? "01");
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // One decoding video at a time on desktop too (phones already ran one): measured, two at once in the
  // attractions track (S03) roughly doubled its dropped frames; same fix as Thrillverse.
  useEffect(() => {
    setPlaybackLimit(1);
    return () => setPlaybackLimit(null);
  }, []);

  // Pins depend on final text metrics: refresh once the display fonts are in.
  useEffect(() => {
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);
    return () => {
      cancelled = true;
      window.removeEventListener("load", onLoad);
    };
  }, []);

  const openDrawer = useCallback((content: DrawerContent, opener?: HTMLElement | null) => setDrawer({ content, opener: opener ?? null }), []);
  const openTickets = useCallback((opener?: HTMLElement | null) => setDrawer({ content: TICKETS, opener: opener ?? null }), []);
  const close = useCallback(() => setDrawer(null), []);

  return (
    <UIContext.Provider value={{ openDrawer, openTickets, scene }}>
      <a href="#a-main" className="a-skip">
        Skip to content
      </a>
      <WonderSounds />
      <CinemaCursor />
      <Nav />
      <main id="a-main" className="a-main">
        <S01Opening />
        <S02Wonder />
        <S03Attractions />
        <S04Adrenaline />
        <ThrillInvite />
        <S05Everyone />
        <S06Beyond />
        <S07AfterDark />
        <S08Visit />
        <S09Final />
      </main>
      <Footer />
      <Drawer content={drawer?.content ?? null} onClose={close} returnTo={drawer?.opener ?? null} />
      <BackToHub className="a-back" />
    </UIContext.Provider>
  );
}

import type { Metadata } from "next";
import { Suspense, type ComponentType } from "react";
import { notFound } from "next/navigation";
import { Gate } from "@/app-hub/entrance/Gate";
import { Marquee } from "@/app-hub/entrance/Marquee";
import { NightSky } from "@/app-hub/entrance/NightSky";
import { Ticket } from "@/app-hub/entrance/Ticket";
import { Track } from "@/app-hub/entrance/Track";
import { ENTRANCE_VARIATIONS, type EntranceSlug } from "@/app-hub/entrance/variations";

const VIEWS: Record<EntranceSlug, ComponentType> = { gate: Gate, ticket: Ticket, "night-sky": NightSky, marquee: Marquee, track: Track };

export function generateStaticParams() {
  return ENTRANCE_VARIATIONS.map((v) => ({ v: v.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ v: string }> }): Promise<Metadata> {
  const { v } = await params;
  const found = ENTRANCE_VARIATIONS.find((x) => x.slug === v);
  return { title: found ? `Entrance: ${found.name}` : "Entrance" };
}

export default function EntranceVariationPage({ params }: { params: Promise<{ v: string }> }) {
  // URL data is read behind Suspense; generateStaticParams prerenders each variation in full.
  return (
    <Suspense fallback={<div className="ent" aria-busy="true" />}>
      <Variation params={params} />
    </Suspense>
  );
}

async function Variation({ params }: { params: Promise<{ v: string }> }) {
  const { v } = await params;
  const View = VIEWS[v as EntranceSlug];
  if (!View) notFound();
  return <View />;
}

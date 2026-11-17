import type { Metadata } from "next";
import { notFound } from "next/navigation";
import data from "../../../../../media/scout/choose.json";
import { Chooser, type ChooseFrame } from "@/app-hub/Chooser";

export const metadata: Metadata = { title: "Picture chooser" };

const WORLDS = ["wonderverse", "thrillverse"] as const;
export function generateStaticParams() {
  return WORLDS.map((world) => ({ world }));
}

export default async function ChooseWorldPage({ params }: { params: Promise<{ world: string }> }) {
  const { world } = await params;
  if (!WORLDS.includes(world as (typeof WORLDS)[number])) notFound();
  return <Chooser data={data as unknown as Record<(typeof WORLDS)[number], ChooseFrame[]>} world={world as (typeof WORLDS)[number]} />;
}

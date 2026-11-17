import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { attractionsIn } from "@/park/content";
import { RideDetailPage } from "@/concepts/b/pages/RideDetailPage";

const rideFor = (slug: string) => attractionsIn("thrillverse").find((a) => a.slug === slug);

/** Static export: one page per Thrillverse attraction. Any other slug is a 404. */
export function generateStaticParams() {
  return attractionsIn("thrillverse").map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/thrillverse/attractions/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const ride = rideFor(slug);
  if (!ride) return { title: "Ride not found" };
  return { title: ride.name, description: `${ride.type}. ${ride.line}` };
}

// The slug is URL data: it is read inside Suspense so the route's shared App Shell stays instant.
// The fallback is the hero's own Ultramarine ground, so nothing jumps when the ride streams in.
export default function Page({ params }: PageProps<"/thrillverse/attractions/[slug]">) {
  return (
    <Suspense fallback={<div className="concept-b-root b-page b-pfallback" aria-hidden="true" />}>
      <Ride params={params} />
    </Suspense>
  );
}

async function Ride({ params }: { params: PageProps<"/thrillverse/attractions/[slug]">["params"] }) {
  const { slug } = await params;
  if (!rideFor(slug)) notFound();
  return <RideDetailPage slug={slug} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { attraction, attractionsIn } from "@/park/content";
import { AttractionDetail } from "@/concepts/a/pages/AttractionDetail";

const wonderRide = (slug: string) => {
  const ride = attraction(slug);
  return ride && ride.world === "wonderverse" ? ride : null;
};

/** Static export: one page per Wonderverse ride; any other slug is a 404. */
export function generateStaticParams() {
  return attractionsIn("wonderverse").map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/wonderverse/attractions/[slug]">): Promise<Metadata> {
  const ride = wonderRide((await params).slug);
  return ride ? { title: ride.name, description: `${ride.type}. ${ride.line}` } : { title: "Ride not found" };
}

// The slug is URL data: it is read inside Suspense so the route's shell stays instant.
// The fallback is the ink ground of the page hero, so nothing jumps when the ride streams in.
export default function Page({ params }: PageProps<"/wonderverse/attractions/[slug]">) {
  return (
    <Suspense fallback={<div className="a-pfallback" aria-hidden="true" />}>
      <Ride params={params} />
    </Suspense>
  );
}

async function Ride({ params }: { params: PageProps<"/wonderverse/attractions/[slug]">["params"] }) {
  const ride = wonderRide((await params).slug);
  if (!ride) notFound();
  return <AttractionDetail ride={ride} />;
}

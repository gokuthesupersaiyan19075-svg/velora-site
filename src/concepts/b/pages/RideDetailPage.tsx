"use client";

import Link from "next/link";
import { useState } from "react";
import { durationLabel, tbc } from "@/park/content";
import { AssetSlot } from "@/shared/media/AssetSlot";
import { pageHref } from "./FooterNav";
import { PageHero } from "./PageHero";
import { PageShell, ShellLaunch } from "./PageShell";
import { intensityLabel, relatedRides, TAG_LABEL, thrillRides, type ThrillRide } from "./rides";

/** One Thrillverse attraction: full-screen kinetic opener, the facts, related rides. */
export function RideDetailPage({ slug }: { slug: string }) {
  const all = thrillRides();
  const index = all.findIndex((r) => r.ride.slug === slug);
  const me = all[index];
  const nextRide = all[(index + 1) % all.length];
  const related = relatedRides(slug);
  if (!me) return null;
  const { ride } = me;

  const facts = [
    { k: "Height requirement", v: ride.facts.minHeightCm === null ? "No minimum height" : `${ride.facts.minHeightCm} cm minimum` },
    { k: "Ride duration", v: durationLabel(ride.facts.durationMin) },
    { k: "Intensity", v: intensityLabel(ride.facts.intensity) },
    { k: "Accessibility", v: ride.facts.accessibility },
    { k: "Zone", v: me.zoneName },
  ];

  return (
    <PageShell slots={[me.slot, ...related.map((r) => r.slot)]} next={{ href: nextRide.href, label: nextRide.ride.name, eyebrow: "Next ride" }}>
      <PageHero
        id="b-ride-h"
        size="ride"
        eyebrow={
          <>
            <span className="b-ride-tag">{TAG_LABEL[me.tag]}</span> <span className="b-phero-type">{ride.type}</span>
          </>
        }
        lines={ride.name.split(" ")}
        label={ride.name}
        sub={ride.line}
        slot={me.slot}
        before={
          <Link href={pageHref("/attractions")} className="b-pback">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All rides
          </Link>
        }
      >
        <ShellLaunch label="Get tickets" />
      </PageHero>

      <section className="b-pbody" aria-labelledby="b-ride-about">
        <div className="b-pbody-inner">
          <h2 id="b-ride-about" className="b-visually-hidden">
            About {ride.name}
          </h2>
          <p className="b-plead" data-reveal>
            {ride.description}
          </p>
          <dl className="b-visit-facts b-pfacts" data-reveal>
            {facts.map((f) => (
              <div key={f.k}>
                <dt>{f.k}</dt>
                <dd data-tbc={f.v === null || undefined}>{tbc(f.v)}</dd>
              </div>
            ))}
          </dl>
          <div className="b-pnote" data-reveal>
            <p className="b-pnote-tag">Rider requirements</p>
            <p>
              Riders are measured at the entrance. {ride.name} is not recommended for guests who are pregnant or have heart, back or neck conditions. Always
              follow the signs and staff at the ride entrance.
            </p>
          </div>
          <div className="b-visit-actions" data-reveal>
            <ShellLaunch variant="dark" label="Get tickets" />
            <Link href={pageHref("/plan")} className="b-btn b-btn--outline">
              Plan your visit
            </Link>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="b-prelated" aria-labelledby="b-related-h">
          <h2 id="b-related-h" className="b-prelated-title b-kin">
            Ride these too
          </h2>
          <ul className="b-pcards">
            {related.map((r) => (
              <RelatedCard key={r.ride.slug} r={r} />
            ))}
          </ul>
        </section>
      )}

    </PageShell>
  );
}

function RelatedCard({ r }: { r: ThrillRide }) {
  const [hot, setHot] = useState(false);
  return (
    <li className="b-pcard" data-reveal onPointerEnter={() => setHot(true)} onPointerLeave={() => setHot(false)}>
      <Link href={r.href} className="b-pcard-link" onFocus={() => setHot(true)} onBlur={() => setHot(false)}>
        <div className="b-pcard-media">
          <AssetSlot slot={r.slot} playback={hot ? "auto" : "still"} playbackPriority={5} pauseControl={false} placeholderClassName="b-ph" sizes="(min-width: 768px) 30vw, 100vw" alt="" />
        </div>
        <span className="b-ride-tag">{TAG_LABEL[r.tag]}</span>
        <span className="b-pcard-name b-kin">{r.ride.name}</span>
        <span className="b-pcard-line">{r.ride.line}</span>
      </Link>
    </li>
  );
}

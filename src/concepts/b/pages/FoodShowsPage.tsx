"use client";

import { tbc, venues, type Venue } from "@/park/content";
import { AssetSlot } from "@/shared/media/AssetSlot";
import { slotsB } from "../slots";
import { pageHref } from "./FooterNav";
import { PageHero } from "./PageHero";
import { PageShell } from "./PageShell";
import { SwitchLink } from "./SwitchLink";
import { slotsPages } from "./slots-pages";

const KIND_LABEL: Record<Venue["kind"], string> = { dining: "Food", show: "Show", event: "Event" };
const GROUPS: { id: string; word: string; title: string; items: Venue[] }[] = [
  { id: "eat", word: "Fuel", title: "Food and drink", items: venues.filter((v) => v.kind === "dining") },
  { id: "watch", word: "Watch", title: "Shows and events", items: venues.filter((v) => v.kind !== "dining") },
];

/**
 * Food, shows and parades are Wonderverse's to tell. Thrillverse lists the same park venues briefly,
 * in its own voice, and points to the full Wonderverse page.
 */
export function FoodShowsPage() {
  return (
    <PageShell slots={[slotsPages.foodHero, slotsB.food2]} next={{ href: pageHref("/plan"), label: "Plan your visit" }}>
      <PageHero
        id="b-food-h"
        eyebrow="Food and shows"
        lines={["Fuel", "up."]}
        label="Food and shows: fuel up between rides"
        sub="The same park, the same kitchens and stages. Here is the quick list; the full story of food, shows and parades lives in Wonderverse."
        slot={slotsPages.foodHero}
      >
        <SwitchLink to="wonderverse" className="b-btn b-btn--ghost">
          Food and shows in Wonderverse
        </SwitchLink>
      </PageHero>

      <div className="b-pvenues">
        {GROUPS.map((g) => (
          <section key={g.id} className="b-pvgroup" aria-labelledby={`b-pv-${g.id}`}>
            <div className="b-pvgroup-head">
              <p className="b-pvword b-kin" aria-hidden="true">
                {g.word}
              </p>
              <h2 id={`b-pv-${g.id}`} className="b-pvgroup-title">
                {g.title}
              </h2>
            </div>
            <ul className="b-pvlist">
              {g.items.map((v) => (
                <li key={v.slug} className="b-pvrow" data-reveal>
                  <div className="b-pvrow-main">
                    <span className="b-ride-tag">
                      {KIND_LABEL[v.kind]}
                      {v.night ? " · After dark" : ""}
                    </span>
                    <h3 className="b-pvrow-name">{v.name}</h3>
                    <p className="b-pvrow-line">{v.line}</p>
                  </div>
                  <dl className="b-pvrow-facts">
                    <div>
                      <dt>Times</dt>
                      <dd>{tbc(v.facts.times)}</dd>
                    </div>
                    <div>
                      <dt>Where</dt>
                      <dd>{tbc(v.facts.location)}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="b-pswitch" aria-labelledby="b-pswitch-h">
        <SwitchLink to="wonderverse" className="b-pswitch-link">
          <div className="b-pswitch-media">
            <AssetSlot slot={slotsB.food2} playback="still" placeholderClassName="b-ph" sizes="(min-width: 900px) 40vw, 100vw" alt="" />
          </div>
          <div className="b-pswitch-copy">
            <span className="b-pswitch-eyebrow">Same park, other world</span>
            <span id="b-pswitch-h" className="b-pswitch-title b-kin">
              Treats, shows and parades
            </span>
            <span className="b-pswitch-go">
              Go to Wonderverse
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path d="M3 12h15M12 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
              </svg>
            </span>
          </div>
        </SwitchLink>
      </section>
    </PageShell>
  );
}

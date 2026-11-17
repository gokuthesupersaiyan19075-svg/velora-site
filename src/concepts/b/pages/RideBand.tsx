import { attractionsIn } from "@/park/content";

/**
 * The Sunburst band from the home page, carrying the real (provisional) Thrillverse ride names.
 * A CSS transform loop (compositor only); static under reduced motion.
 */
export function RideBand({ words }: { words?: string[] }) {
  const list = words ?? attractionsIn("thrillverse").map((a) => a.name);
  const row = (hidden: boolean) => (
    <ul className="b-marquee-row" aria-hidden={hidden || undefined}>
      {list.map((n) => (
        <li key={n}>
          <span>{n}</span>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 0l2.6 7.4L20 10l-7.4 2.6L10 20l-2.6-7.4L0 10l7.4-2.6z" />
          </svg>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="b-marquee b-pband" role="region" aria-label="Thrillverse rides">
      <div className="b-marquee-track b-pband-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

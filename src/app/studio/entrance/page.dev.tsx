import type { Metadata } from "next";
import Link from "next/link";
import { ENTRANCE_VARIATIONS } from "@/app-hub/entrance/variations";

export const metadata: Metadata = { title: "Entrance variations" };

// Internal: live redesigns of the public entrance (/). Never linked from customer-facing pages.
export default function EntranceIndexPage() {
  return (
    <div className="ent-index">
      <header className="ent-index-head">
        <nav className="ent-index-crumbs" aria-label="Breadcrumb">
          <Link href="/studio">Studio</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Entrance</span>
        </nav>
        <h1>Entrance variations</h1>
        <p className="ent-index-lede">Five ways in to VELORA. Each opens full screen, exactly as a visitor would see the entrance.</p>
      </header>
      <ul className="ent-index-list">
        {ENTRANCE_VARIATIONS.map((v) => (
          <li key={v.slug} className="ent-index-item">
            <Link href={`/studio/entrance/${v.slug}`}>
              <strong>{v.name}</strong>
              <span>{v.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

import Link from "next/link";
import { experiences } from "@/experiences/registry";

export default function StudioPage() {
  return (
    <div className="hub board">
      <header className="board-head">
        <nav className="hub-crumbs" aria-label="Breadcrumb">
          <Link href="/">VELORA</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Studio</span>
        </nav>
        <h1 className="board-title">Studio</h1>
        <p className="board-lede">Internal tools for the VELORA team. Visitors never see these pages.</p>
      </header>
      <section className="board-section">
        <ul className="board-shots">
          <li className="board-shot">
            <h2>
              <Link href="/studio/assets" className="hub-link">
                Asset board
              </Link>
            </h2>
            <p className="board-lede">Choose the photograph or clip for every frame in each experience.</p>
          </li>
          {experiences.map((e) => (
            <li key={e.id} className="board-shot">
              <h2>
                <Link href={`/studio/storyboards/${e.id}`} className="hub-link">
                  {e.name}: storyboard
                </Link>
              </h2>
              <p className="board-lede">Scene-by-scene motion and layout spec for the home page.</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

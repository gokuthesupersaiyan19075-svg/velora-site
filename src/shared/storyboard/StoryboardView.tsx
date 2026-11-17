import Link from "next/link";
import { BackToHub } from "../BackToHub";
import { SCENE_FIELDS, type Storyboard } from "./types";

/**
 * Renders a concept's storyboard as a readable spec. Styling comes from the concept's own
 * theme via the .sb-* classes it defines (each theme.css styles these under its root class).
 */
export function StoryboardView({ sb, conceptHref }: { sb: Storyboard; conceptHref: string }) {
  return (
    <div className="sb">
      <header className="sb-head">
        <nav className="sb-crumbs" aria-label="Breadcrumb">
          <Link href="/">All concepts</Link>
          <span aria-hidden="true">/</span>
          <Link href={conceptHref}>{sb.name}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Storyboard</span>
        </nav>
        <h1 className="sb-title">{sb.name}: storyboard</h1>
        <p className="sb-lede">{sb.direction}</p>
        <div className="sb-actions">
          <Link href={conceptHref} className="sb-button">
            Open the concept
          </Link>
        </div>
      </header>

      <section className="sb-system" aria-labelledby="sb-system-h">
        <h2 id="sb-system-h">Visual and motion identity</h2>
        <div className="sb-grid">
          <div>
            <h3>Signature moment</h3>
            <p>{sb.signature}</p>
          </div>
          <div>
            <h3>Typography</h3>
            <p>
              Display: {sb.type.display}. Body: {sb.type.body}. {sb.type.notes}
            </p>
          </div>
          <div>
            <h3>Palette</h3>
            <ul className="sb-swatches">
              {sb.palette.map((c) => (
                <li key={c.hex}>
                  <span className="sb-swatch" style={{ background: c.hex }} aria-hidden="true" />
                  <span>
                    <strong>{c.name}</strong> {c.hex}
                    <br />
                    {c.role}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Motion language</h3>
            <ul className="sb-list">
              {sb.motionLanguage.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Interface components</h3>
            <ul className="sb-list">
              {sb.components.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Reduced motion</h3>
            <p>{sb.reducedMotion}</p>
          </div>
        </div>
      </section>

      <ol className="sb-scenes" aria-label="Scenes">
        {sb.scenes.map((s) => (
          <li key={s.n} className="sb-scene" id={`scene-${s.n}`}>
            <div className="sb-scene-head">
              <span className="sb-scene-n">Scene {s.n}</span>
              <h2>{s.title}</h2>
              <p>{s.intent}</p>
            </div>
            <dl className="sb-fields">
              {SCENE_FIELDS.map((f) => (
                <div key={f.key} className="sb-field">
                  <dt>{f.label}</dt>
                  <dd>{s[f.key] as string}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ol>
      <BackToHub />
    </div>
  );
}

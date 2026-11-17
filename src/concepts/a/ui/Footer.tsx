import Link from "next/link";
import { PAGES_A } from "../pages/site";
import { ThrillLink } from "../pages/ThrillLink";

export function Footer() {
  return (
    <footer className="a-footer">
      <div className="a-wrap a-footer-grid">
        <p className="a-footer-mark">VELORA</p>
        <nav aria-label="Footer" className="a-footer-nav">
          {PAGES_A.filter((p) => p.path !== "").map((p) => (
            <Link key={p.path} href={p.href}>
              {p.label}
            </Link>
          ))}
          <ThrillLink />
          <Link href="/">VELORA entrance</Link>
        </nav>
      </div>
      <div className="a-wrap a-footer-legal">
        <p>
          Wonderverse, one of two ways into VELORA. Lake Aurelia Road, Novara Bay · Open daily 10:00 to 22:00 · +1 555 0142 300 ·
          hello@velorapark.example
        </p>
      </div>
    </footer>
  );
}

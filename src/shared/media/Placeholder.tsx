import Link from "next/link";

/**
 * A clearly marked stand-in for a shot that has no approved asset yet.
 * Uses currentColor so each concept's palette tints it. Fills its positioned parent.
 */
export function Placeholder({ slotId, needs, className = "" }: { slotId: string; needs: string; className?: string }) {
  return (
    <div className={`velora-placeholder ${className}`} role="img" aria-label={`Placeholder: ${needs}. Awaiting asset approval.`}>
      <div className="velora-placeholder__inner">
        <span className="velora-placeholder__tag">Placeholder</span>
        <span className="velora-placeholder__needs">{needs}</span>
        <Link href={`/assets#${slotId}`} className="velora-placeholder__link">
          Choose an asset
        </Link>
      </div>
    </div>
  );
}

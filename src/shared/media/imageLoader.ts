/**
 * Image loader for the static export (Cloudflare Pages has no image optimiser).
 * scripts/export.mjs writes each local photo and poster as WebP at these widths under /media/sized,
 * keeping its path: /media/graded/x.jpg → /media/sized/graded/x-1600.webp. Remote images pass through.
 */
export const SIZED_WIDTHS = [640, 1080, 1600, 2400] as const;

export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  if (!src.startsWith("/media/")) return src;
  const w = SIZED_WIDTHS.find((x) => x >= width) ?? SIZED_WIDTHS[SIZED_WIDTHS.length - 1];
  return `/media/sized/${src.slice("/media/".length).replace(/\.[a-z]+$/i, "")}-${w}.webp`;
}

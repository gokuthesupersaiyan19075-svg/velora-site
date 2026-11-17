import type { NextConfig } from "next";

/**
 * VELORA_EXPORT=1 (scripts/export.mjs) builds the public static site for Cloudflare Pages:
 * - the studio and its APIs (files named *.dev.tsx / *.dev.ts) are left out;
 * - photos come pre-sized from /media/sized (see src/shared/media/imageLoader.ts);
 * - redirects come from public/_redirects instead of this file.
 */
const EXPORT = process.env.VELORA_EXPORT === "1";

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_VELORA_EXPORT: EXPORT ? "1" : "" },
  // The export leaves the studio out, so its route types no longer exist: types are checked by the normal
  // build (npm run build / tsc), not again here.
  ...(EXPORT && { output: "export", trailingSlash: true, typescript: { ignoreBuildErrors: true } }),
  pageExtensions: EXPORT ? ["tsx", "ts"] : ["tsx", "ts", "dev.tsx", "dev.ts"],
  // Partial prerendering cannot run in a static export (every page is fully prerendered there anyway).
  cacheComponents: !EXPORT,
  partialPrefetching: !EXPORT,
  // Old URLs keep working. Mirrored in public/_redirects for Cloudflare Pages (static export ignores this).
  ...(!EXPORT && { redirects }),
  images: EXPORT
    ? { loader: "custom", loaderFile: "./src/shared/media/imageLoader.ts" }
    : {
        // Chooser previews show candidate photos straight from Pexels before they are added.
        remotePatterns: [{ protocol: "https", hostname: "images.pexels.com" }],
        // Originals live in /public/media/photos untouched; next/image derives sized AVIF/WebP on request.
        formats: ["image/avif", "image/webp"],
        qualities: [70, 80, 90],
        deviceSizes: [640, 828, 1080, 1440, 1920, 2560],
      },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

async function redirects() {
  return [
      { source: "/cinematic/:path*", destination: "/wonderverse/:path*", permanent: false },
      { source: "/adrenaline/:path*", destination: "/thrillverse/:path*", permanent: false },
      { source: "/concept-a/:path*", destination: "/wonderverse/:path*", permanent: false },
      { source: "/concept-b/:path*", destination: "/thrillverse/:path*", permanent: false },
      { source: "/concept-c/:path*", destination: "/", permanent: false },
      { source: "/universe/:path*", destination: "/", permanent: false },
      { source: "/universe", destination: "/", permanent: false },
      { source: "/assets", destination: "/studio/assets", permanent: false },
    ];
}

export default nextConfig;

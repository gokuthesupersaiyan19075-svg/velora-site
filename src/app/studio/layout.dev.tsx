import type { Metadata } from "next";

// Internal tools (asset board, storyboards). Never linked from customer-facing pages.
export const metadata: Metadata = { title: { default: "Studio", template: "%s | VELORA studio" }, robots: { index: false, follow: false } };

export default function StudioLayout({ children }: LayoutProps<"/studio">) {
  return children;
}

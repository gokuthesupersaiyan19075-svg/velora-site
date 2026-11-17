import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import { ExperienceTransition } from "@/experiences/ExperienceTransition";
import { NavHistory } from "@/shared/navHistory";
import "./globals.css";

const brandSans = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-hub", display: "swap" });

export const metadata: Metadata = {
  title: { default: "VELORA: choose how you enter the park", template: "%s | VELORA" },
  description: "VELORA is an amusement park you can explore two ways: Wonderverse and Thrillverse.",
  // Pre-launch: keep search engines out until the park's facts are confirmed.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0E0D12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={brandSans.variable}>
      <body>
        {children}
        <NavHistory />
        <ExperienceTransition />
      </body>
    </html>
  );
}

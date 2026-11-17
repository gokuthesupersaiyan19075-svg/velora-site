import type { Metadata } from "next";
import { ExperienceShell } from "@/experiences/ExperienceShell";
import { Big_Shoulders, Instrument_Sans } from "next/font/google";

const display = Big_Shoulders({ subsets: ["latin"], variable: "--font-a-display", axes: ["opsz"], display: "swap" });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-a-body", axes: ["wdth"], display: "swap" });

export const metadata: Metadata = { title: { default: "Wonderverse", template: "%s | Wonderverse | VELORA" } };

export default function ConceptALayout({ children }: LayoutProps<"/wonderverse">) {
  return (
    <div className={`concept-a ${display.variable} ${body.variable}`}>
      <ExperienceShell id="wonderverse">{children}</ExperienceShell>
    </div>
  );
}

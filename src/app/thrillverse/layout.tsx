import type { Metadata } from "next";
import { ExperienceShell } from "@/experiences/ExperienceShell";
import { Archivo } from "next/font/google";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-b", axes: ["wdth"], display: "swap" });

export const metadata: Metadata = { title: { default: "Thrillverse", template: "%s | Thrillverse | VELORA" } };

export default function ConceptBLayout({ children }: LayoutProps<"/thrillverse">) {
  return (
    <div className={`concept-b ${archivo.variable}`}>
      <ExperienceShell id="thrillverse">{children}</ExperienceShell>
    </div>
  );
}

import { Archivo, Big_Shoulders, Instrument_Sans } from "next/font/google";
import type { ReactNode } from "react";

// Each world's own faces, used inside its half of the entrance mockups.
const wonderDisplay = Big_Shoulders({ subsets: ["latin"], variable: "--font-ent-wonder", axes: ["opsz"], display: "swap" });
const wonderBody = Instrument_Sans({ subsets: ["latin"], variable: "--font-ent-wonder-body", axes: ["wdth"], display: "swap" });
const thrill = Archivo({ subsets: ["latin"], variable: "--font-ent-thrill", axes: ["wdth"], display: "swap" });

export default function EntranceStudioLayout({ children }: { children: ReactNode }) {
  return <div className={`${wonderDisplay.variable} ${wonderBody.variable} ${thrill.variable}`}>{children}</div>;
}

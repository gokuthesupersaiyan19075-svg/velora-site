import type { Metadata } from "next";
import { AttractionsPage } from "@/concepts/b/pages/AttractionsPage";

export const metadata: Metadata = {
  title: "Attractions",
  description: "Every Thrillverse ride at VELORA: coasters, drop towers, extreme water and adventure. Minimum heights, ride times and access for every ride.",
};

export default function Page() {
  return <AttractionsPage />;
}

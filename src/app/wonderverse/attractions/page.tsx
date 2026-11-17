import type { Metadata } from "next";
import { AttractionsPage } from "@/concepts/a/pages/AttractionsPage";

export const metadata: Metadata = {
  title: "Attractions",
  description: "Every Wonderverse ride at VELORA, from golden carousels and the wheel to gentle water and a coaster that glows after dark.",
};

export default function Page() {
  return <AttractionsPage />;
}

import type { Metadata } from "next";
import { FoodShowsPage } from "@/concepts/b/pages/FoodShowsPage";

export const metadata: Metadata = {
  title: "Food and shows",
  description: "Where to refuel between rides at VELORA, and the park's shows and events. Opening times and where to find them.",
};

export default function Page() {
  return <FoodShowsPage />;
}

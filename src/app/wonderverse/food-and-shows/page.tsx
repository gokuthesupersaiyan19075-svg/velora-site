import type { Metadata } from "next";
import { FoodShowsPage } from "@/concepts/a/pages/FoodShowsPage";

export const metadata: Metadata = {
  title: "Food and shows",
  description: "Treats, meals, shows and the evening events of Wonderverse at VELORA. Times and places for every treat and show.",
};

export default function Page() {
  return <FoodShowsPage />;
}

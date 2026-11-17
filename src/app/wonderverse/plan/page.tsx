import type { Metadata } from "next";
import { PlanPage } from "@/concepts/a/pages/PlanPage";

export const metadata: Metadata = {
  title: "Plan your visit",
  description: "Location, opening hours, getting here, the park's zones, accessibility and questions for your VELORA visit. Open daily 10:00 to 22:00 on Lake Aurelia Road, Novara Bay.",
};

export default function Page() {
  return <PlanPage />;
}

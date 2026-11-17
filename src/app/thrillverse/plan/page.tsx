import type { Metadata } from "next";
import { PlanPage } from "@/concepts/b/pages/PlanPage";

export const metadata: Metadata = {
  title: "Plan your visit",
  description: "Opening hours, getting to VELORA, rider requirements and answers to common questions. Open daily 10:00 to 22:00 on Lake Aurelia Road, Novara Bay.",
};

export default function Page() {
  return <PlanPage />;
}

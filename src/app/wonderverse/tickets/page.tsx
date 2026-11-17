import type { Metadata } from "next";
import { TicketsPage } from "@/concepts/a/pages/TicketsPage";

export const metadata: Metadata = {
  title: "Tickets",
  description: "Book VELORA tickets online: Day Pass ₹2,499, Family Pass ₹7,999, After Dark Pass ₹1,499, Season Pass ₹9,999. Pay at the gate.",
};

export default function Page() {
  return <TicketsPage />;
}

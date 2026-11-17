import type { Metadata } from "next";
import { AdminApp } from "@/admin/AdminApp";
import "@/admin/admin.css";

export const metadata: Metadata = {
  title: "Bookings admin",
  robots: { index: false, follow: false },
};

/** Park staff only: sign in and manage bookings. Access is enforced by Supabase row-level security. */
export default function AdminPage() {
  return <AdminApp />;
}

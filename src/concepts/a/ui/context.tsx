"use client";

import { createContext, useContext } from "react";
import type { MediaSlot } from "@/shared/media/types";

export type DrawerItem = { slot: MediaSlot; title: string; meta: string; body: string };
export type DrawerContent = {
  title: string;
  body: string;
  action?: { label: string; href: string };
  /** A preview of the subject (its own video or photo). */
  media?: MediaSlot;
  /** Short facts shown as a grid. */
  facts?: { label: string; value: string }[];
  /** Places in a group (food stands, shows, water rides), each with its own picture. */
  items?: DrawerItem[];
};

export const UIContext = createContext<{
  openDrawer: (c: DrawerContent, opener?: HTMLElement | null) => void;
  openTickets: (opener?: HTMLElement | null) => void;
  scene: string;
}>({ openDrawer: () => {}, openTickets: () => {}, scene: "01" });

export const useUI = () => useContext(UIContext);

export const TICKETS: DrawerContent = {
  title: "Tickets",
  body: "Day Pass ₹2,499 · Family Pass (2 adults, 2 children) ₹7,999 · After Dark Pass ₹1,499 · Season Pass ₹9,999. Children under 3 go free. Book online in under a minute and pay at the gate; open daily 10:00 to 22:00.",
  action: { label: "Book tickets", href: "/wonderverse/tickets#book" },
};

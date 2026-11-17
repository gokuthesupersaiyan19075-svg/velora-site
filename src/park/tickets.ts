import { price, tickets, type TicketType } from "./content";

/**
 * Ticketing, shared by both worlds. Tickets are booked on each world's tickets page (BookingForm →
 * src/park/booking.ts → Supabase) and paid at the gate.
 */
export function listTicketTypes(): TicketType[] {
  return tickets;
}

/** "From ₹1,499" */
export const fromPrice = () => `From ${price(Math.min(...tickets.map((t) => t.price ?? Infinity)))}`;
export const priceLabel = (t: TicketType) => price(t.price);

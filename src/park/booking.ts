/**
 * Ticket bookings, shared by both worlds and the admin page. Talks to Supabase over its REST API
 * (no SDK needed for three calls). Only the public anon key ships to the browser; what it can do is
 * limited by row-level security (supabase/migrations): visitors can only call `create_booking`, which
 * validates the input and returns a reference. Reading or changing bookings needs a signed-in admin.
 * The service-role key is never used by the site.
 */
import { tickets, type TicketType } from "./content";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const bookingConfigured = () => !!SB_URL && !!ANON;

export interface BookingInput {
  name: string;
  email: string;
  phone: string;
  visitDate: string; // YYYY-MM-DD
  ticketType: string;
  quantity: number;
  world: "wonderverse" | "thrillverse";
}

export type BookingStatus = "confirmed" | "checked_in" | "cancelled";

export interface Booking {
  id: string;
  reference: string;
  name: string;
  email: string;
  phone: string;
  visit_date: string;
  ticket_type: string;
  quantity: number;
  total_price: number;
  world: string;
  status: BookingStatus;
  created_at: string;
}

export const MAX_QUANTITY = 10;
/** Bookings open for visits from today up to a year ahead. */
export const BOOKING_DAYS_AHEAD = 365;

/** Local date as YYYY-MM-DD. */
export const isoDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const firstBookableDay = () => isoDay();
export const lastBookableDay = () => {
  const d = new Date();
  d.setDate(d.getDate() + BOOKING_DAYS_AHEAD);
  return isoDay(d);
};

/** The park is closed on Tuesdays from November to February (content.ts → season). */
export function closedOn(day: string): boolean {
  const d = new Date(`${day}T12:00:00`);
  const m = d.getMonth(); // 0 = January
  return d.getDay() === 2 && (m >= 10 || m <= 1);
}

export const ticketType = (slug: string): TicketType | undefined => tickets.find((t) => t.slug === slug);
export const totalPrice = (slug: string, quantity: number) => (ticketType(slug)?.price ?? 0) * quantity;

export type FieldErrors = Partial<Record<keyof BookingInput, string>>;

export function validateBooking(b: BookingInput): FieldErrors {
  const e: FieldErrors = {};
  if (b.name.trim().length < 2) e.name = "Enter the name the booking is for.";
  else if (b.name.trim().length > 120) e.name = "Keep the name under 120 characters.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(b.email.trim())) e.email = "Enter a valid email address, like name@example.com.";
  const digits = b.phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15 || !/^[+\d][\d\s().-]*$/.test(b.phone.trim())) e.phone = "Enter a phone number with 7 to 15 digits.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.visitDate)) e.visitDate = "Choose the day of your visit.";
  else if (b.visitDate < firstBookableDay()) e.visitDate = "Choose today or a later day.";
  else if (b.visitDate > lastBookableDay()) e.visitDate = "Bookings open up to a year ahead.";
  else if (closedOn(b.visitDate)) e.visitDate = "The park is closed on Tuesdays from November to February. Choose another day.";
  if (!ticketType(b.ticketType)) e.ticketType = "Choose a ticket type.";
  if (!Number.isInteger(b.quantity) || b.quantity < 1 || b.quantity > MAX_QUANTITY) e.quantity = `Choose between 1 and ${MAX_QUANTITY} tickets.`;
  return e;
}

async function rest<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  if (!bookingConfigured()) throw new Error("Online booking is not available right now. Please call or email the park.");
  const { token, headers, ...rest } = init;
  const res = await fetch(`${SB_URL}${path}`, {
    ...rest,
    headers: { apikey: ANON, Authorization: `Bearer ${token ?? ANON}`, "Content-Type": "application/json", ...headers },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = (data && (data.message || data.msg || data.error_description || data.error)) || `Request failed (${res.status})`;
    throw new Error(String(msg));
  }
  return data as T;
}

/** Saves a booking and returns its reference, e.g. "VEL-7K3F-9QXA". */
export async function createBooking(b: BookingInput): Promise<{ reference: string; total: number }> {
  const errors = validateBooking(b);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const rows = await rest<{ reference: string; total_price: number }[]>("/rest/v1/rpc/create_booking", {
    method: "POST",
    body: JSON.stringify({
      p_name: b.name.trim(),
      p_email: b.email.trim().toLowerCase(),
      p_phone: b.phone.trim(),
      p_visit_date: b.visitDate,
      p_ticket_type: b.ticketType,
      p_quantity: b.quantity,
      p_world: b.world,
    }),
  });
  const row = Array.isArray(rows) ? rows[0] : (rows as unknown as { reference: string; total_price: number });
  return { reference: row.reference, total: row.total_price };
}

/**
 * Asks the server-side function to email the confirmation. "sent" only when the email provider accepted the
 * message; anything else (not set up yet, provider error, offline) is "failed" so the page never claims otherwise.
 */
export async function sendConfirmationEmail(reference: string, email: string): Promise<"sent" | "failed"> {
  if (!bookingConfigured()) return "failed";
  try {
    const res = await fetch(`${SB_URL}/functions/v1/send-booking-email`, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
      body: JSON.stringify({ reference, email: email.trim().toLowerCase() }),
    });
    if (!res.ok) return "failed";
    const data = await res.json().catch(() => null);
    return data?.status === "sent" ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

// ---------- admin (signed-in park staff only; enforced by RLS, not by this code) ----------

const SESSION_KEY = "velora:admin-session";
export type AdminSession = { access_token: string; refresh_token: string; expires_at: number; email: string };

function saveSession(s: AdminSession | null) {
  try {
    if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage blocked: the session lasts for this page only */
  }
}

type TokenResponse = { access_token: string; refresh_token: string; expires_in: number; user: { email: string } };
const toSession = (r: TokenResponse): AdminSession => ({ access_token: r.access_token, refresh_token: r.refresh_token, expires_at: Date.now() + r.expires_in * 1000, email: r.user.email });

export async function adminSignIn(email: string, password: string): Promise<AdminSession> {
  const r = await rest<TokenResponse>("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) });
  const s = toSession(r);
  // Only accounts listed as admins may continue (checked by the database).
  const ok = await rest<boolean>("/rest/v1/rpc/is_admin", { method: "POST", body: "{}", token: s.access_token });
  if (!ok) {
    await adminSignOut(s);
    throw new Error("This account does not have admin access.");
  }
  saveSession(s);
  return s;
}

/** The stored session, refreshed if it is about to expire; null when signed out. */
export async function adminSession(): Promise<AdminSession | null> {
  let s: AdminSession | null = null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    s = raw ? (JSON.parse(raw) as AdminSession) : null;
  } catch {
    s = null;
  }
  if (!s) return null;
  if (s.expires_at - Date.now() > 60_000) return s;
  try {
    const r = await rest<TokenResponse>("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: s.refresh_token }) });
    s = toSession(r);
    saveSession(s);
    return s;
  } catch {
    saveSession(null);
    return null;
  }
}

export async function adminSignOut(s?: AdminSession | null) {
  const session = s ?? (await adminSession());
  saveSession(null);
  if (session) await rest("/auth/v1/logout", { method: "POST", token: session.access_token }).catch(() => {});
}

export async function listBookings(s: AdminSession, { status, date, search }: { status?: BookingStatus | ""; date?: string; search?: string } = {}): Promise<Booking[]> {
  const q = new URLSearchParams({ select: "*", order: "visit_date.asc,created_at.desc", limit: "500" });
  if (status) q.set("status", `eq.${status}`);
  if (date) q.set("visit_date", `eq.${date}`);
  const term = search?.trim().replace(/[,()*]/g, "");
  if (term) q.set("or", `(reference.ilike.*${term}*,name.ilike.*${term}*,email.ilike.*${term}*)`);
  return rest<Booking[]>(`/rest/v1/bookings?${q}`, { token: s.access_token });
}

export async function setBookingStatus(s: AdminSession, id: string, status: BookingStatus): Promise<void> {
  await rest(`/rest/v1/bookings?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }), token: s.access_token, headers: { Prefer: "return=minimal" } });
}

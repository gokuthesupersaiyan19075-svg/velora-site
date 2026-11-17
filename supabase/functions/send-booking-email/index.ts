// Sends the booking confirmation email through Resend. Runs on Supabase (Deno); secrets live only there:
//   RESEND_API_KEY   Resend API key (never in the browser or the repo)
//   MAIL_FROM        e.g. VELORA <bookings@velorapark.dev>  (must be on a domain verified in Resend)
//   MAIL_REPLY_TO    optional reply address
//   ALLOWED_ORIGINS  optional, comma-separated site origins allowed to call this (default: any)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided to Edge Functions automatically.
//
// The browser sends only { reference, email }. The function loads the booking itself, checks the email
// matches that booking, sends once, and replies "sent" only when Resend accepted the message.

const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("MAIL_FROM") ?? "";
const REPLY_TO = Deno.env.get("MAIL_REPLY_TO") ?? "";
const ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const MAX_ATTEMPTS = 3;

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);
const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const longDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allow = ORIGINS.length === 0 ? "*" : ORIGINS.includes(origin) ? origin : ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}
const json = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });

function db(path: string, init: RequestInit = {}) {
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, 405, { status: "failed" });
  if (!SB_URL || !SERVICE || !RESEND_KEY || !FROM) return json(req, 503, { status: "not_configured" });

  let reference = "";
  let email = "";
  try {
    const b = await req.json();
    reference = String(b.reference ?? "").trim().toUpperCase();
    email = String(b.email ?? "").trim().toLowerCase();
  } catch {
    return json(req, 400, { status: "failed" });
  }
  if (!/^VEL-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(reference) || !email) return json(req, 400, { status: "failed" });

  const r = await db(`bookings?reference=eq.${encodeURIComponent(reference)}&select=*&limit=1`);
  const rows = r.ok ? await r.json() : [];
  const booking = rows[0];
  // Same answer whether the reference is unknown or the email is wrong: nothing is revealed.
  if (!booking || String(booking.email).toLowerCase() !== email) return json(req, 404, { status: "failed" });
  if (booking.email_sent_at) return json(req, 200, { status: "sent", already: true });
  if ((booking.email_attempts ?? 0) >= MAX_ATTEMPTS) return json(req, 429, { status: "failed" });

  const tr = await db(`ticket_types?slug=eq.${encodeURIComponent(booking.ticket_type)}&select=name,price&limit=1`);
  const ticket = (tr.ok ? await tr.json() : [])[0];
  const ticketName: string = ticket?.name ?? booking.ticket_type;
  const unit: number | null = ticket?.price ?? null;
  const world = booking.world === "thrillverse" ? "Thrillverse" : "Wonderverse";
  const visit = longDate(booking.visit_date);
  const tickets = `${booking.quantity} × ${ticketName}${unit !== null ? ` (${money(unit)} each)` : ""}`;

  const rowsHtml: [string, string][] = [
    ["Booking reference", `<strong style="font-size:20px;letter-spacing:.06em">${esc(booking.reference)}</strong>`],
    ["Name", esc(booking.name)],
    ["Email", esc(booking.email)],
    ["Phone", esc(booking.phone)],
    ["Visit date", esc(visit)],
    ["Tickets", esc(tickets)],
    ["Total, paid at the gate", `<strong>${money(booking.total_price)}</strong>`],
  ];
  const cell = "padding:12px 16px;border-bottom:1px solid #2B2838";
  const html = `<!doctype html><html><body style="margin:0;background:#0E0D12;font-family:Arial,Helvetica,sans-serif;color:#F3F1F7">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<p style="letter-spacing:.3em;font-size:13px;margin:0 0 8px">VELORA</p>
<h1 style="font-size:26px;margin:0 0 8px">Your booking is confirmed</h1>
<p style="margin:0 0 24px;color:#C9C5D6">Thank you, ${esc(booking.name)}. We look forward to seeing you in ${world}.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1B1926;border-radius:8px">
${rowsHtml.map(([k, v]) => `<tr><td style="${cell};color:#C9C5D6;font-size:13px;width:42%">${k}</td><td style="${cell};font-size:15px">${v}</td></tr>`).join("")}
</table>
<p style="margin:24px 0 0;color:#C9C5D6;font-size:14px;line-height:1.5">Show this reference at the Main Gate on ${esc(visit)}. Gates open at 10:00. Payment is taken at the gate. To change or cancel, reply to this email with your reference.</p>
</div></body></html>`;
  const text = [
    "VELORA: your booking is confirmed",
    "",
    `Booking reference: ${booking.reference}`,
    `Name: ${booking.name}`,
    `Email: ${booking.email}`,
    `Phone: ${booking.phone}`,
    `Visit date: ${visit}`,
    `Tickets: ${tickets}`,
    `Total, paid at the gate: ${money(booking.total_price)}`,
    "",
    `Show this reference at the Main Gate on ${visit}. Gates open at 10:00. To change or cancel, reply to this email with your reference.`,
  ].join("\n");

  let delivered = false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `booking-${booking.reference}` },
      body: JSON.stringify({ from: FROM, to: [booking.email], subject: `Your VELORA booking ${booking.reference}`, html, text, ...(REPLY_TO && { reply_to: REPLY_TO }) }),
    });
    delivered = res.ok;
    if (!res.ok) console.error("resend", res.status, await res.text());
  } catch (e) {
    console.error("resend request failed", e);
  }

  const attempts = (booking.email_attempts ?? 0) + 1;
  await db(`bookings?id=eq.${booking.id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(delivered ? { email_sent_at: new Date().toISOString(), email_attempts: attempts } : { email_attempts: attempts }),
  });
  return delivered ? json(req, 200, { status: "sent" }) : json(req, 502, { status: "failed" });
});

"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { price } from "@/park/content";
import {
  adminSession,
  adminSignIn,
  adminSignOut,
  bookingConfigured,
  listBookings,
  setBookingStatus,
  ticketType,
  type AdminSession,
  type Booking,
  type BookingStatus,
} from "@/park/booking";

const STATUS_LABEL: Record<BookingStatus, string> = { confirmed: "Confirmed", checked_in: "Checked in", cancelled: "Cancelled" };
const day = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

/** Sign-in, then a plain booking list with search, filters and status changes. */
export function AdminApp() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    adminSession()
      .then(setSession)
      .finally(() => setChecking(false));
  }, []);

  return (
    <div className="adm">
      <header className="adm-head">
        <p className="adm-brand">VELORA</p>
        <h1>Bookings</h1>
        {session && (
          <div className="adm-who">
            <span>{session.email}</span>
            <button
              type="button"
              className="adm-btn adm-btn--ghost"
              onClick={async () => {
                await adminSignOut(session);
                setSession(null);
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </header>
      <main className="adm-main">
        {!bookingConfigured() ? (
          <p className="adm-alert" role="alert">
            The booking database is not configured for this build.
          </p>
        ) : checking ? (
          <p className="adm-muted">Checking your session…</p>
        ) : session ? (
          <BookingList session={session} onExpired={() => setSession(null)} />
        ) : (
          <SignIn onSignedIn={setSession} />
        )}
      </main>
    </div>
  );
}

function SignIn({ onSignedIn }: { onSignedIn: (s: AdminSession) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      onSignedIn(await adminSignIn(email.trim(), password));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(/invalid login|invalid_grant|credentials/i.test(msg) ? "Wrong email or password." : msg || "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="adm-card adm-signin" onSubmit={submit}>
      <h2>Staff sign-in</h2>
      <label>
        Email
        <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Password
        <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      {error && (
        <p className="adm-alert" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="adm-btn" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

function BookingList({ session, onExpired }: { session: AdminSession; onExpired: () => void }) {
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<BookingStatus | "">("");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const s = await adminSession();
      if (!s) return onExpired();
      setRows(await listBookings(s, { status, date, search: query }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load bookings.");
    } finally {
      setLoading(false);
    }
  }, [status, date, query, onExpired]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetches from Supabase, then sets state
    load();
  }, [load]);
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(search), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const change = async (b: Booking, next: BookingStatus) => {
    if (next === "cancelled" && !window.confirm(`Cancel booking ${b.reference} for ${b.name}?`)) return;
    try {
      const s = (await adminSession()) ?? session;
      await setBookingStatus(s, b.id, next);
      setRows((r) => r.map((x) => (x.id === b.id ? { ...x, status: next } : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the booking.");
    }
  };

  const totals = useMemo(() => {
    const live = rows.filter((r) => r.status !== "cancelled");
    return { bookings: live.length, tickets: live.reduce((n, r) => n + r.quantity, 0), value: live.reduce((n, r) => n + r.total_price, 0) };
  }, [rows]);

  return (
    <section className="adm-list" aria-labelledby="adm-list-h">
      <h2 id="adm-list-h" className="adm-sr">
        All bookings
      </h2>
      <div className="adm-filters">
        <label>
          Search
          <input type="search" placeholder="Reference, name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label>
          Visit date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as BookingStatus | "")}>
            <option value="">All</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked_in">Checked in</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={load}>
          Refresh
        </button>
      </div>

      <p className="adm-totals" aria-live="polite">
        {loading ? "Loading…" : `${totals.bookings} active booking${totals.bookings === 1 ? "" : "s"} · ${totals.tickets} tickets · ${price(totals.value)} due at the gate`}
      </p>
      {error && (
        <p className="adm-alert" role="alert">
          {error}
        </p>
      )}

      {!loading && rows.length === 0 ? (
        <p className="adm-muted">No bookings match.</p>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Reference</th>
                <th scope="col">Visit</th>
                <th scope="col">Visitor</th>
                <th scope="col">Tickets</th>
                <th scope="col">Total</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="adm-sr">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} data-status={b.status}>
                  <td className="adm-ref">{b.reference}</td>
                  <td>{day(b.visit_date)}</td>
                  <td>
                    <strong>{b.name}</strong>
                    <br />
                    <a href={`mailto:${b.email}`}>{b.email}</a>
                    <br />
                    <a href={`tel:${b.phone.replace(/[^\d+]/g, "")}`}>{b.phone}</a>
                  </td>
                  <td>
                    {b.quantity} × {ticketType(b.ticket_type)?.name ?? b.ticket_type}
                    <br />
                    <span className="adm-muted">via {b.world === "thrillverse" ? "Thrillverse" : "Wonderverse"}</span>
                  </td>
                  <td>{price(b.total_price)}</td>
                  <td>
                    <span className="adm-badge" data-status={b.status}>
                      {STATUS_LABEL[b.status]}
                    </span>
                  </td>
                  <td className="adm-actions">
                    {b.status !== "checked_in" && b.status !== "cancelled" && (
                      <button type="button" className="adm-btn adm-btn--small" onClick={() => change(b, "checked_in")}>
                        Check in
                      </button>
                    )}
                    {b.status !== "cancelled" ? (
                      <button type="button" className="adm-btn adm-btn--small adm-btn--ghost" onClick={() => change(b, "cancelled")}>
                        Cancel
                      </button>
                    ) : (
                      <button type="button" className="adm-btn adm-btn--small adm-btn--ghost" onClick={() => change(b, "confirmed")}>
                        Restore
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

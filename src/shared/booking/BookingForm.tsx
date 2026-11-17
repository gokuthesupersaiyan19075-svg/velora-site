"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { park, price, tickets } from "@/park/content";
import {
  bookingConfigured,
  createBooking,
  sendConfirmationEmail,
  firstBookableDay,
  lastBookableDay,
  MAX_QUANTITY,
  ticketType,
  totalPrice,
  validateBooking,
  type BookingInput,
  type FieldErrors,
} from "@/park/booking";

type Done = { reference: string; total: number; input: BookingInput };

const longDate = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/**
 * The ticket booking form, shared by both worlds. All logic lives in src/park/booking.ts; each world
 * styles it through its own class prefix (a-book… for Wonderverse, b-book… for Thrillverse).
 * No payment: the reference is shown at the gate and the ticket is paid there.
 */
export function BookingForm({
  world,
  prefix,
  ticket,
  onTicketChange,
  onBooked,
}: {
  world: BookingInput["world"];
  prefix: "a" | "b";
  /** Controlled ticket type (the page's own ticket picker), optional. */
  ticket?: string;
  onTicketChange?: (slug: string) => void;
  onBooked?: (reference: string) => void;
}) {
  const id = useId();
  const c = (s: string) => `${prefix}-book${s}`;
  const [state, setForm] = useState({ name: "", email: "", phone: "", visitDate: "", ticketType: ticket ?? tickets[0].slug, quantity: 1 });
  // The page's own ticket picker (when given) is the source of truth for the ticket type.
  const form = ticket ? { ...state, ticketType: ticket } : state;
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState("");
  const [done, setDone] = useState<Done | null>(null);
  // Only "sent" once the email provider has accepted the message; never assumed.
  const [mail, setMail] = useState<"sending" | "sent" | "failed">("sending");
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const [minDay, setMinDay] = useState("");
  const [maxDay, setMaxDay] = useState("");
  useEffect(() => {
    // The visitor's own date (the page is pre-rendered, so not at build time).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the browser after mount
    setMinDay(firstBookableDay());
    setMaxDay(lastBookableDay());
  }, []);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
    if (k === "ticketType") onTicketChange?.(v as string);
  };

  const input: BookingInput = { ...form, world };
  const t = ticketType(form.ticketType);
  const total = totalPrice(form.ticketType, form.quantity);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFailure("");
    const errs = validateBooking(input);
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setSending(true);
    try {
      const r = await createBooking(input);
      setDone({ ...r, input });
      setMail("sending");
      void sendConfirmationEmail(r.reference, input.email).then(setMail);
      onBooked?.(r.reference);
      requestAnimationFrame(() => doneRef.current?.focus());
    } catch (err) {
      setFailure(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    const dt = ticketType(done.input.ticketType);
    return (
      <div ref={doneRef} className={c("-done")} tabIndex={-1} role="status" aria-live="polite">
        <p className={c("-done-tag")}>Booking confirmed</p>
        <p className={c("-ref")}>
          <span className={c("-ref-label")}>Your booking reference</span>
          <strong className={c("-ref-code")}>{done.reference}</strong>
        </p>
        <dl className={c("-summary")}>
          <div>
            <dt>Name</dt>
            <dd>{done.input.name}</dd>
          </div>
          <div>
            <dt>Visit</dt>
            <dd>{longDate(done.input.visitDate)}</dd>
          </div>
          <div>
            <dt>Tickets</dt>
            <dd>
              {done.input.quantity} × {dt?.name}
            </dd>
          </div>
          <div>
            <dt>Total, paid at the gate</dt>
            <dd>{price(done.total)}</dd>
          </div>
        </dl>
        <p className={c("-done-note")}>
          Show this reference at the Main Gate on {longDate(done.input.visitDate)}. Gates open at 10:00. To change or cancel, email {park.facts.email} with your reference.
        </p>
        <p className={c("-done-note")} role="status" aria-live="polite">
          {mail === "sending" && `Sending a confirmation email to ${done.input.email}…`}
          {mail === "sent" && `A confirmation email has been sent to ${done.input.email}.`}
          {mail === "failed" && "We could not send a confirmation email. Your booking is saved: keep the reference above."}
        </p>
        <button
          type="button"
          className={c("-again")}
          onClick={() => {
            setDone(null);
            setForm((f) => ({ ...f, quantity: 1 }));
          }}
        >
          Make another booking
        </button>
      </div>
    );
  }

  const field = (name: keyof FieldErrors) => ({
    id: `${id}-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${id}-${name}-err` : undefined,
  });
  const err = (name: keyof FieldErrors) =>
    errors[name] ? (
      <p id={`${id}-${name}-err`} className={c("-err")}>
        {errors[name]}
      </p>
    ) : null;

  return (
    <form ref={formRef} className={c("")} onSubmit={submit} noValidate aria-describedby={`${id}-note`}>
      <div className={c("-grid")}>
        <div className={c("-field")}>
          <label htmlFor={`${id}-name`}>Full name</label>
          <input {...field("name")} type="text" autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} required maxLength={120} />
          {err("name")}
        </div>
        <div className={c("-field")}>
          <label htmlFor={`${id}-email`}>Email</label>
          <input {...field("email")} type="email" autoComplete="email" inputMode="email" value={form.email} onChange={(e) => set("email", e.target.value)} required maxLength={254} />
          {err("email")}
        </div>
        <div className={c("-field")}>
          <label htmlFor={`${id}-phone`}>Phone</label>
          <input {...field("phone")} type="tel" autoComplete="tel" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} required maxLength={32} />
          {err("phone")}
        </div>
        <div className={c("-field")}>
          <label htmlFor={`${id}-visitDate`}>Visit date</label>
          <input {...field("visitDate")} type="date" min={minDay || undefined} max={maxDay || undefined} value={form.visitDate} onChange={(e) => set("visitDate", e.target.value)} required />
          {err("visitDate")}
        </div>
        <div className={c("-field")}>
          <label htmlFor={`${id}-ticketType`}>Ticket type</label>
          <select {...field("ticketType")} value={form.ticketType} onChange={(e) => set("ticketType", e.target.value)}>
            {tickets.map((x) => (
              <option key={x.slug} value={x.slug}>
                {x.name}: {price(x.price)}
              </option>
            ))}
          </select>
          {err("ticketType")}
        </div>
        <div className={c("-field")}>
          <label htmlFor={`${id}-quantity`}>Quantity</label>
          <div className={c("-qty")}>
            <button type="button" aria-label="One fewer ticket" onClick={() => set("quantity", Math.max(1, form.quantity - 1))} disabled={form.quantity <= 1}>
              −
            </button>
            <input
              {...field("quantity")}
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_QUANTITY}
              value={form.quantity}
              onChange={(e) => set("quantity", Math.max(0, Math.min(MAX_QUANTITY, Math.floor(Number(e.target.value) || 0))))}
            />
            <button type="button" aria-label="One more ticket" onClick={() => set("quantity", Math.min(MAX_QUANTITY, form.quantity + 1))} disabled={form.quantity >= MAX_QUANTITY}>
              +
            </button>
          </div>
          {err("quantity")}
        </div>
      </div>

      <div className={c("-foot")}>
        <p className={c("-total")} aria-live="polite">
          <span>Total</span>
          <strong>{price(total)}</strong>
          {t && t.admits > 1 && <span className={c("-admits")}>admits {t.admits * form.quantity}</span>}
        </p>
        <button type="submit" className={c("-submit")} disabled={sending || !bookingConfigured()} aria-busy={sending || undefined}>
          {sending ? "Booking…" : "Book now"}
        </button>
      </div>
      <p id={`${id}-note`} className={c("-note")}>
        No payment online: you pay at the gate with your booking reference. Your details are used only for this booking.
      </p>
      {(failure || !bookingConfigured()) && (
        <p className={c("-failure")} role="alert">
          {failure || `Online booking is unavailable right now. Call ${park.facts.phone} or email ${park.facts.email} to book.`}
        </p>
      )}
    </form>
  );
}

-- Confirmation emails: the Edge Function `send-booking-email` (service role, server side only) records
-- when a confirmation was actually accepted by the email provider, so one booking is never emailed twice
-- and the site only says "sent" after the provider accepted the message.
alter table public.bookings add column if not exists email_sent_at timestamptz;
alter table public.bookings add column if not exists email_attempts integer not null default 0;

-- VELORA ticket bookings.
-- Visitors (anon key) can only call create_booking(), which validates the input, prices it from
-- ticket_types and returns a unique reference. They cannot read, change or delete any booking.
-- Signed-in admins (listed in public.admins) can list bookings and change their status only.

create table if not exists public.ticket_types (
  slug text primary key,
  name text not null,
  price integer not null check (price >= 0),
  admits integer not null default 1 check (admits >= 1)
);

insert into public.ticket_types (slug, name, price, admits) values
  ('day-pass', 'Day Pass', 2499, 1),
  ('family-pass', 'Family Pass', 7999, 4),
  ('after-dark', 'After Dark Pass', 1499, 1),
  ('season-pass', 'Season Pass', 9999, 1)
on conflict (slug) do update set name = excluded.name, price = excluded.price, admits = excluded.admits;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) <= 254 and email ~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'),
  phone text not null check (char_length(phone) between 7 and 32),
  visit_date date not null,
  ticket_type text not null references public.ticket_types (slug),
  quantity integer not null check (quantity between 1 and 10),
  total_price integer not null check (total_price >= 0),
  world text not null check (world in ('wonderverse', 'thrillverse')),
  status text not null default 'confirmed' check (status in ('confirmed', 'checked_in', 'cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists bookings_visit_date_idx on public.bookings (visit_date);
create index if not exists bookings_email_created_idx on public.bookings (email, created_at);

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.ticket_types enable row level security;
alter table public.bookings enable row level security;
alter table public.admins enable row level security;

-- Is the signed-in user an admin? (security definer: admins itself stays unreadable)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Prices are public.
drop policy if exists "ticket types are public" on public.ticket_types;
create policy "ticket types are public" on public.ticket_types for select to anon, authenticated using (true);

-- Bookings: admins read and update; nobody inserts or deletes directly.
drop policy if exists "admins read bookings" on public.bookings;
create policy "admins read bookings" on public.bookings for select to authenticated using ((select public.is_admin()));
drop policy if exists "admins update bookings" on public.bookings;
create policy "admins update bookings" on public.bookings for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Table privileges as a second line of defence: visitors get nothing, admins may change only the status.
revoke all on public.bookings from anon, authenticated;
grant select on public.bookings to authenticated;
grant update (status) on public.bookings to authenticated;
revoke all on public.admins from anon, authenticated;
revoke all on public.ticket_types from anon, authenticated;
grant select on public.ticket_types to anon, authenticated;

-- The only way to create a booking.
create or replace function public.create_booking(
  p_name text,
  p_email text,
  p_phone text,
  p_visit_date date,
  p_ticket_type text,
  p_quantity integer,
  p_world text
)
returns table (reference text, total_price integer)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_price integer;
  v_ref text;
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_month integer;
  i integer;
begin
  p_name := btrim(coalesce(p_name, ''));
  p_email := lower(btrim(coalesce(p_email, '')));
  p_phone := btrim(coalesce(p_phone, ''));

  if char_length(p_name) < 2 or char_length(p_name) > 120 then
    raise exception 'Enter the name the booking is for.' using errcode = '22023';
  end if;
  if p_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' or char_length(p_email) > 254 then
    raise exception 'Enter a valid email address.' using errcode = '22023';
  end if;
  if char_length(regexp_replace(p_phone, '\D', '', 'g')) not between 7 and 15 or char_length(p_phone) > 32 then
    raise exception 'Enter a phone number with 7 to 15 digits.' using errcode = '22023';
  end if;
  if p_visit_date is null or p_visit_date < (now() at time zone 'Asia/Kolkata')::date - 1 or p_visit_date > current_date + 366 then
    raise exception 'Choose a visit date from today up to a year ahead.' using errcode = '22023';
  end if;
  v_month := extract(month from p_visit_date);
  if extract(isodow from p_visit_date) = 2 and (v_month >= 11 or v_month <= 2) then
    raise exception 'The park is closed on Tuesdays from November to February.' using errcode = '22023';
  end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 10 then
    raise exception 'Choose between 1 and 10 tickets.' using errcode = '22023';
  end if;
  if p_world not in ('wonderverse', 'thrillverse') then
    raise exception 'Unknown experience.' using errcode = '22023';
  end if;

  select t.price into v_price from public.ticket_types t where t.slug = p_ticket_type;
  if v_price is null then
    raise exception 'Choose a ticket type.' using errcode = '22023';
  end if;

  -- Basic abuse guard: at most 10 bookings per email address per hour.
  if (select count(*) from public.bookings b where b.email = p_email and b.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many bookings for this email address. Please try again later.' using errcode = '22023';
  end if;

  -- Unique, unguessable reference: VEL-XXXX-XXXX (no 0/O or 1/I).
  loop
    v_bytes := uuid_send(gen_random_uuid());
    v_ref := 'VEL-';
    for i in 0..7 loop
      if i = 4 then v_ref := v_ref || '-'; end if;
      v_ref := v_ref || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.bookings b where b.reference = v_ref);
  end loop;

  insert into public.bookings (reference, name, email, phone, visit_date, ticket_type, quantity, total_price, world)
  values (v_ref, p_name, p_email, p_phone, p_visit_date, p_ticket_type, p_quantity, v_price * p_quantity, p_world);

  return query select v_ref, v_price * p_quantity;
end;
$$;

revoke all on function public.create_booking(text, text, text, date, text, integer, text) from public;
grant execute on function public.create_booking(text, text, text, date, text, integer, text) to anon, authenticated;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

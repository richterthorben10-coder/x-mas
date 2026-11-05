-- Geschenkeplaner: im Supabase SQL Editor genau einmal ausführen.
-- Alle privaten Datensätze sind über Row Level Security geschützt.
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Unser Weihnachten' check (char_length(name) between 1 and 100),
  invite_code text not null unique default (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
  created_at timestamptz not null default now()
);
create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id),
  unique (user_id)
);
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  budget numeric(12,2) not null default 0 check (budget >= 0),
  created_at timestamptz not null default now()
);
create index if not exists idx_people_household on public.people(household_id);
create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  price numeric(12,2) not null default 0 check (price >= 0),
  bought boolean not null default false,
  wrapped boolean not null default false,
  created_at timestamptz not null default now(),
  constraint wrapped_requires_bought check (not wrapped or bought)
);
create index if not exists idx_gifts_person on public.gifts(person_id);

-- Geschützter Mitgliedschaftstest, verhindert rekursive RLS-Abfragen.
create or replace function public.is_household_member(hid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.household_members m
                where m.household_id = hid and m.user_id = (select auth.uid()));
$$;
revoke all on function public.is_household_member(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated;

-- Die beiden Join-Operationen erfolgen atomar auf dem Server.
create or replace function public.create_household()
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Bitte anmelden'; end if;
  if exists(select 1 from public.household_members where user_id = (select auth.uid())) then
    raise exception 'Du gehörst bereits zu einer Liste';
  end if;
  insert into public.households default values returning id into new_id;
  insert into public.household_members(household_id,user_id) values(new_id,(select auth.uid()));
  return new_id;
end;
$$;
revoke all on function public.create_household() from public;
grant execute on function public.create_household() to authenticated;

create or replace function public.join_household(code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid; count_members integer;
begin
  if (select auth.uid()) is null then raise exception 'Bitte anmelden'; end if;
  if exists(select 1 from public.household_members where user_id = (select auth.uid())) then
    raise exception 'Du gehörst bereits zu einer Liste';
  end if;
  -- Sperrt den Haushalt während des Beitritts, verhindert mehr als zwei Teilnehmer.
  select id into new_id from public.households where invite_code = btrim(code) for update;
  if new_id is null then raise exception 'Einladungscode unbekannt'; end if;
  select count(*) into count_members from public.household_members where household_id = new_id;
  if count_members >= 2 then raise exception 'Diese Liste hat bereits zwei Mitglieder'; end if;
  insert into public.household_members(household_id,user_id) values(new_id,(select auth.uid()));
  return new_id;
end;
$$;
revoke all on function public.join_household(text) from public;
grant execute on function public.join_household(text) to authenticated;

create or replace function public.rotate_invite_code()
returns text language plpgsql security definer set search_path = '' as $$
declare new_code text; hid uuid;
begin
  select household_id into hid from public.household_members where user_id = (select auth.uid());
  if hid is null then raise exception 'Keine Liste vorhanden'; end if;
  new_code := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  update public.households set invite_code = new_code where id = hid;
  return new_code;
end;
$$;
revoke all on function public.rotate_invite_code() from public;
grant execute on function public.rotate_invite_code() to authenticated;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.people enable row level security;
alter table public.gifts enable row level security;

drop policy if exists "members_read_household" on public.households;
create policy "members_read_household" on public.households for select to authenticated
  using (public.is_household_member(id));
drop policy if exists "members_read_members" on public.household_members;
create policy "members_read_members" on public.household_members for select to authenticated
  using (public.is_household_member(household_id));
drop policy if exists "members_read_people" on public.people;
create policy "members_read_people" on public.people for select to authenticated
  using (public.is_household_member(household_id));
drop policy if exists "members_insert_people" on public.people;
create policy "members_insert_people" on public.people for insert to authenticated
  with check (public.is_household_member(household_id));
drop policy if exists "members_update_people" on public.people;
create policy "members_update_people" on public.people for update to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
drop policy if exists "members_delete_people" on public.people;
create policy "members_delete_people" on public.people for delete to authenticated
  using (public.is_household_member(household_id));
drop policy if exists "members_read_gifts" on public.gifts;
create policy "members_read_gifts" on public.gifts for select to authenticated
  using (exists (select 1 from public.people p where p.id = person_id and public.is_household_member(p.household_id)));
drop policy if exists "members_insert_gifts" on public.gifts;
create policy "members_insert_gifts" on public.gifts for insert to authenticated
  with check (exists (select 1 from public.people p where p.id = person_id and public.is_household_member(p.household_id)));
drop policy if exists "members_update_gifts" on public.gifts;
create policy "members_update_gifts" on public.gifts for update to authenticated
  using (exists (select 1 from public.people p where p.id = person_id and public.is_household_member(p.household_id)))
  with check (exists (select 1 from public.people p where p.id = person_id and public.is_household_member(p.household_id)));
drop policy if exists "members_delete_gifts" on public.gifts;
create policy "members_delete_gifts" on public.gifts for delete to authenticated
  using (exists (select 1 from public.people p where p.id = person_id and public.is_household_member(p.household_id)));

-- Explizit nur die für die App notwendigen Tabellenrechte freigeben.
revoke all on public.households,public.household_members,public.people,public.gifts from anon;
grant select on public.households, public.household_members to authenticated;
grant select,insert,update,delete on public.people, public.gifts to authenticated;

-- Realtime für automatisch aktualisierte Listen. Keine öffentlichen Leserechte.
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='people') then
    alter publication supabase_realtime add table public.people;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='gifts') then
    alter publication supabase_realtime add table public.gifts;
  end if;
end $$;

-- Carnet de muscu : schéma Supabase
-- À coller une seule fois dans Supabase > SQL Editor > New query > Run.
-- Chaque table est protégée par Row Level Security : chaque utilisatrice
-- ne voit et ne modifie que ses propres lignes.

-- Bibliothèque d'exercices
create table if not exists public.exercises (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  unit        text not null default 'kg' check (unit in ('kg','assist','bodyweight','time')),
  notes       text default '',
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Séances types (ex. "Bas A"), avec la liste ordonnée de leurs exercices en JSON :
-- items = [{ "exercise_id": uuid, "sets": 3, "rep_min": 8, "rep_max": 12, "rest": "2 min", "note": "par jambe" }, ...]
create table if not exists public.workouts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  focus       text default '',
  weekday     smallint check (weekday between 0 and 6),   -- 0 = dimanche, 1 = lundi…
  position    integer not null default 0,
  items       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

-- Séances réalisées :
-- entries = { "<exercise_id>": [ { "w": 40, "r": 12 }, ... ], ... }
create table if not exists public.sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  workout_id  uuid references public.workouts(id) on delete set null,
  workout_name text default '',
  date        date not null,
  entries     jsonb not null default '{}'::jsonb,
  note        text default '',
  updated_at  timestamptz not null default now(),
  unique (user_id, date, workout_id)
);

create index if not exists sessions_user_date on public.sessions (user_id, date desc);

alter table public.exercises enable row level security;
alter table public.workouts  enable row level security;
alter table public.sessions  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['exercises','workouts','sessions'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

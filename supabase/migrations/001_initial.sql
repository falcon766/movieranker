-- MovieRanker initial schema
-- Run in Supabase SQL editor (or via CLI)

create extension if not exists "pgcrypto";

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (
    username is null or username ~ '^[a-z0-9_]{3,24}$'
  )
);

-- Lists
create type public.list_visibility as enum ('private', 'unlisted', 'public', 'invite');

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  target_size int not null default 25 check (target_size between 1 and 250),
  visibility public.list_visibility not null default 'private',
  allow_overflow boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug)
);

create index if not exists lists_owner_id_idx on public.lists (owner_id);
create index if not exists lists_visibility_idx on public.lists (visibility);

-- List items
create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  tmdb_id int not null,
  title text not null,
  year int,
  poster_path text,
  position int,
  elo numeric not null default 1000,
  notes text,
  source text not null default 'manual' check (source in ('manual', 'letterboxd', 'suggestion')),
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (list_id, tmdb_id)
);

create index if not exists list_items_list_id_idx on public.list_items (list_id);
create index if not exists list_items_list_position_idx on public.list_items (list_id, position);

-- Battles
create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  winner_item_id uuid references public.list_items (id) on delete set null,
  loser_item_id uuid references public.list_items (id) on delete set null,
  is_draw boolean not null default false,
  elo_winner_before numeric,
  elo_winner_after numeric,
  elo_loser_before numeric,
  elo_loser_after numeric,
  created_at timestamptz not null default now()
);

create index if not exists battles_list_id_idx on public.battles (list_id);

-- Invites
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  token text not null unique,
  email text,
  role text not null default 'viewer',
  created_by uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- Letterboxd imports
create table if not exists public.letterboxd_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  filename text,
  row_count int not null default 0,
  matched_count int not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.letterboxd_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  import_id uuid not null references public.letterboxd_imports (id) on delete cascade,
  name text not null,
  year int,
  rating numeric,
  tmdb_id int,
  match_status text not null default 'unmatched',
  created_at timestamptz not null default now()
);

create index if not exists letterboxd_ratings_user_id_idx on public.letterboxd_ratings (user_id);

-- TMDB cache
create table if not exists public.tmdb_cache (
  tmdb_id int primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g'))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger lists_updated_at before update on public.lists
  for each row execute function public.set_updated_at();
create trigger list_items_updated_at before update on public.list_items
  for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.battles enable row level security;
alter table public.invites enable row level security;
alter table public.letterboxd_imports enable row level security;
alter table public.letterboxd_ratings enable row level security;
alter table public.tmdb_cache enable row level security;

-- Profiles policies
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Lists policies
create policy "Owners manage lists"
  on public.lists for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Public and unlisted lists are readable"
  on public.lists for select
  using (visibility in ('public', 'unlisted'));

create policy "Invite lists readable with valid invite"
  on public.lists for select
  using (
    visibility = 'invite'
    and exists (
      select 1 from public.invites i
      where i.list_id = lists.id
        and i.revoked_at is null
        and (i.expires_at is null or i.expires_at > now())
    )
  );

-- List items
create policy "Owners manage list items"
  on public.list_items for all
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_items.list_id and l.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.lists l
      where l.id = list_items.list_id and l.owner_id = auth.uid()
    )
  );

create policy "Readable items for readable lists"
  on public.list_items for select
  using (
    exists (
      select 1 from public.lists l
      where l.id = list_items.list_id
        and (
          l.owner_id = auth.uid()
          or l.visibility in ('public', 'unlisted')
          or (
            l.visibility = 'invite'
            and exists (
              select 1 from public.invites i
              where i.list_id = l.id
                and i.revoked_at is null
                and (i.expires_at is null or i.expires_at > now())
            )
          )
        )
    )
  );

-- Battles
create policy "Owners manage battles"
  on public.battles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Invites
create policy "Owners manage invites"
  on public.invites for all
  using (
    exists (
      select 1 from public.lists l
      where l.id = invites.list_id and l.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.lists l
      where l.id = invites.list_id and l.owner_id = auth.uid()
    )
  );

create policy "Anyone can read invite by token lookup via join"
  on public.invites for select
  using (revoked_at is null);

-- Letterboxd
create policy "Users manage own imports"
  on public.letterboxd_imports for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own ratings"
  on public.letterboxd_ratings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- TMDB cache readable by authenticated users; writes via service role ideally
create policy "Auth users read tmdb cache"
  on public.tmdb_cache for select
  using (auth.role() = 'authenticated');

create policy "Auth users upsert tmdb cache"
  on public.tmdb_cache for insert
  with check (auth.role() = 'authenticated');

create policy "Auth users update tmdb cache"
  on public.tmdb_cache for update
  using (auth.role() = 'authenticated');

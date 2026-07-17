-- Fix infinite recursion between lists <-> invites RLS policies
-- Run this in the Supabase SQL Editor

-- Helper functions bypass RLS (SECURITY DEFINER) to break recursion cycles
create or replace function public.is_list_owner(list_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.lists l
    where l.id = list_uuid
      and l.owner_id = auth.uid()
  );
$$;

create or replace function public.list_has_valid_invite(list_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.invites i
    where i.list_id = list_uuid
      and i.revoked_at is null
      and (i.expires_at is null or i.expires_at > now())
  );
$$;

create or replace function public.can_read_list(list_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.lists l
    where l.id = list_uuid
      and (
        l.owner_id = auth.uid()
        or l.visibility in ('public', 'unlisted')
        or (
          l.visibility = 'invite'
          and public.list_has_valid_invite(l.id)
        )
      )
  );
$$;

-- Recreate invites policies without querying lists under RLS
drop policy if exists "Owners manage invites" on public.invites;
create policy "Owners manage invites"
  on public.invites for all
  using (public.is_list_owner(list_id))
  with check (public.is_list_owner(list_id));

-- Recreate lists invite-read policy via helper
drop policy if exists "Invite lists readable with valid invite" on public.lists;
create policy "Invite lists readable with valid invite"
  on public.lists for select
  using (
    visibility = 'invite'
    and public.list_has_valid_invite(id)
  );

-- Recreate list_items policies via helper (avoids nested lists/invites RLS)
drop policy if exists "Owners manage list items" on public.list_items;
create policy "Owners manage list items"
  on public.list_items for all
  using (public.is_list_owner(list_id))
  with check (public.is_list_owner(list_id));

drop policy if exists "Readable items for readable lists" on public.list_items;
create policy "Readable items for readable lists"
  on public.list_items for select
  using (public.can_read_list(list_id));

-- Battles: keep owner-scoped (already uses user_id); no change required
-- Grant execute on helpers to authenticated + anon (for public share pages)
grant execute on function public.is_list_owner(uuid) to anon, authenticated;
grant execute on function public.list_has_valid_invite(uuid) to anon, authenticated;
grant execute on function public.can_read_list(uuid) to anon, authenticated;

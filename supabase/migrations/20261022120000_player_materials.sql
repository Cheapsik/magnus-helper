-- Players and shared materials (docs: CONTINUE.md, "Materiały dla graczy").
-- Only what players need lives in the cloud: a shared campaign, its members, its invite and
-- its materials. Everything else in a campaign stays in the GM's browser.

create table public.shared_campaigns (
  id text primary key,                     -- the GM's local campaign id
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  created_at timestamptz not null default now()
);

-- Kept apart from the campaign so members, who can read the campaign, never see the token.
create table public.campaign_invites (
  campaign_id text primary key references public.shared_campaigns (id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(18), 'hex')
);

create table public.campaign_members (
  campaign_id text not null references public.shared_campaigns (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  joined_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null references public.shared_campaigns (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  body text not null default '' check (char_length(body) <= 20000),
  image_path text,                         -- object name in the "materials" bucket
  shared boolean not null default false,
  audience uuid[],                         -- null: every member; else only these users
  shared_at timestamptz,
  shown_at timestamptz,                    -- "Pokaż teraz": players open it full screen
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index materials_campaign_idx on public.materials (campaign_id, created_at desc);

-- Security definer so policies can ask without recursing into each other's RLS.
create function public.is_campaign_owner(cid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from shared_campaigns where id = cid and owner_id = auth.uid());
$$;

create function public.is_campaign_member(cid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from campaign_members where campaign_id = cid and user_id = auth.uid());
$$;

create function public.can_see_material(m public.materials) returns boolean
language sql stable security definer set search_path = public as $$
  select m.shared
     and is_campaign_member(m.campaign_id)
     and (m.audience is null or auth.uid() = any (m.audience));
$$;

-- Players join only through a valid invite; they never read invites or other members.
create function public.join_campaign(invite_token text, name text)
returns table (campaign_id text, campaign_name text)
language plpgsql security definer set search_path = public as $$
declare
  cid text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if char_length(trim(name)) not between 1 and 60 then raise exception 'invalid name'; end if;
  select i.campaign_id into cid from campaign_invites i where i.token = invite_token;
  if cid is null then raise exception 'invalid invite'; end if;
  if is_campaign_owner(cid) then raise exception 'owner cannot join own campaign'; end if;
  insert into campaign_members (campaign_id, user_id, display_name)
  values (cid, auth.uid(), trim(name))
  on conflict (campaign_id, user_id) do update set display_name = excluded.display_name;
  return query select c.id, c.name from shared_campaigns c where c.id = cid;
end;
$$;

alter table public.shared_campaigns enable row level security;
alter table public.campaign_invites enable row level security;
alter table public.campaign_members enable row level security;
alter table public.materials enable row level security;

create policy "owner manages campaign" on public.shared_campaigns
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "members read campaign" on public.shared_campaigns
  for select using (public.is_campaign_member(id));

create policy "owner manages invite" on public.campaign_invites
  for all using (public.is_campaign_owner(campaign_id)) with check (public.is_campaign_owner(campaign_id));

create policy "owner reads members" on public.campaign_members
  for select using (public.is_campaign_owner(campaign_id));
create policy "owner removes members" on public.campaign_members
  for delete using (public.is_campaign_owner(campaign_id));
create policy "member reads self" on public.campaign_members
  for select using (user_id = auth.uid());
create policy "member renames self" on public.campaign_members
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "member leaves" on public.campaign_members
  for delete using (user_id = auth.uid());

create policy "owner manages materials" on public.materials
  for all using (public.is_campaign_owner(campaign_id)) with check (public.is_campaign_owner(campaign_id));
create policy "members read shared materials" on public.materials
  for select using (public.can_see_material(materials));

grant execute on function public.join_campaign(text, text) to authenticated;

-- Live updates for players; Realtime applies the policies above to every event.
alter publication supabase_realtime add table public.materials;

-- Images: private bucket, objects named "<campaign id>/<material id>.jpg".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materials', 'materials', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']);

create policy "owner manages material images" on storage.objects
  for all to authenticated
  using (bucket_id = 'materials' and public.is_campaign_owner(split_part(name, '/', 1)))
  with check (bucket_id = 'materials' and public.is_campaign_owner(split_part(name, '/', 1)));
create policy "members read shared material images" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'materials'
    and exists (select 1 from public.materials m where m.image_path = storage.objects.name and public.can_see_material(m))
  );

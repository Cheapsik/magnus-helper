-- The GM's own campaigns and everything in them (docs/adr/0010). The browser keeps a copy for
-- offline play and pushes changes here (src/lib/cloudSync.ts); this is the copy that survives.

create table public.campaigns (
  id text primary key,                     -- the id the browser gave the campaign
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  updated_at timestamptz not null default now()
);
create index campaigns_owner_idx on public.campaigns (owner_id);

-- One row per storage key of a campaign; the value is the exact string the browser stores.
create table public.campaign_data (
  campaign_id text not null references public.campaigns (id) on delete cascade,
  key text not null check (char_length(key) between 1 and 200),
  value text not null check (octet_length(value) <= 5242880),
  updated_at timestamptz not null default now(),
  primary key (campaign_id, key)
);

-- Security definer so the data and file policies can ask without recursing into RLS.
create function public.owns_campaign(cid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from campaigns where id = cid and owner_id = auth.uid());
$$;

alter table public.campaigns enable row level security;
alter table public.campaign_data enable row level security;

create policy "owner manages own campaigns" on public.campaigns
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner manages campaign data" on public.campaign_data
  for all using (public.owns_campaign(campaign_id)) with check (public.owns_campaign(campaign_id));

-- This project grants new tables nothing by default; anonymous visitors get no access at all.
grant select, insert, update, delete on public.campaigns, public.campaign_data to authenticated;
grant execute on function public.owns_campaign(text) to authenticated;

-- Map images and ambient audio: private bucket, objects named "<campaign id>/<images|audio>/<id>".
-- 50 MB is the per-file ceiling of the free plan.
insert into storage.buckets (id, name, public, file_size_limit)
values ('campaign-files', 'campaign-files', false, 52428800);

create policy "owner manages campaign files" on storage.objects
  for all to authenticated
  using (bucket_id = 'campaign-files' and public.owns_campaign(split_part(name, '/', 1)))
  with check (bucket_id = 'campaign-files' and public.owns_campaign(split_part(name, '/', 1)));

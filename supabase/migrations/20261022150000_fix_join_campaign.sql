-- join_campaign returned a column named campaign_id, which made the bare campaign_id in its
-- ON CONFLICT clause ambiguous. Name the conflict by constraint and qualify every column.
create or replace function public.join_campaign(invite_token text, name text)
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
  insert into campaign_members as m (campaign_id, user_id, display_name)
  values (cid, auth.uid(), trim(name))
  on conflict on constraint campaign_members_pkey do update set display_name = excluded.display_name;
  return query select c.id, c.name from shared_campaigns c where c.id = cid;
end;
$$;

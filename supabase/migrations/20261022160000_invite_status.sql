-- Lets the app resolve an invite once: open the campaign for an existing member, send the owner
-- back to the GM view, and ask only newcomers for a name. No rows for a dead token.
create function public.invite_status(invite_token text)
returns table (campaign_id text, campaign_name text, is_member boolean, is_owner boolean)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, is_campaign_member(c.id), c.owner_id = auth.uid()
  from campaign_invites i join shared_campaigns c on c.id = i.campaign_id
  where i.token = invite_token and auth.uid() is not null;
$$;

grant execute on function public.invite_status(text) to authenticated;

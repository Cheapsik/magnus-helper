-- Lets the invite screen name the campaign before the player has signed in.
-- Reveals only the name, and only to someone holding a valid token.
create function public.invite_preview(invite_token text) returns text
language sql stable security definer set search_path = public as $$
  select c.name from campaign_invites i join shared_campaigns c on c.id = i.campaign_id where i.token = invite_token;
$$;

grant execute on function public.invite_preview(text) to anon, authenticated;

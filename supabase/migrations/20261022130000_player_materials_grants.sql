-- This project grants new tables nothing usable by default; row level security still decides
-- which rows each signed-in user reaches. Anonymous visitors get no access at all.
grant select, insert, update, delete on public.shared_campaigns, public.campaign_invites, public.campaign_members, public.materials to authenticated;
grant execute on function public.is_campaign_owner(text), public.is_campaign_member(text), public.can_see_material(public.materials) to authenticated;

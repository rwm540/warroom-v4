-- Restrict group and team-registration-session reads to their owner, leader, members or admins.
begin;

drop policy if exists "warroom_groups_select_member_or_admin" on public.warroom_groups;
create policy "warroom_groups_select_member_or_admin"
on public.warroom_groups
for select to authenticated
using (
  public.warroom_is_admin()
  or data->>'leader_id' = public.warroom_current_user_id()
  or public.warroom_current_user_id() = any (
    select jsonb_array_elements_text(
      case when jsonb_typeof(data->'member_ids') = 'array'
        then data->'member_ids' else '[]'::jsonb end
    )
  )
  or exists (
    select 1 from public.warroom_users u
    where u.id = public.warroom_current_user_id()
      and u.data->>'group_id' = public.warroom_groups.id
  )
);

alter table public.warroom_team_registration_sessions enable row level security;
drop policy if exists "policy_team_sessions_select" on public.warroom_team_registration_sessions;
create policy "policy_team_sessions_select"
on public.warroom_team_registration_sessions
for select to authenticated
using (
  public.warroom_is_admin()
  or data->>'leader_id' = public.warroom_current_user_id()
  or data->>'creator_id' = public.warroom_current_user_id()
);

drop policy if exists "policy_team_sessions_manage" on public.warroom_team_registration_sessions;
create policy "policy_team_sessions_manage"
on public.warroom_team_registration_sessions
for all to authenticated
using (
  public.warroom_is_admin()
  or data->>'leader_id' = public.warroom_current_user_id()
  or data->>'creator_id' = public.warroom_current_user_id()
)
with check (
  public.warroom_is_admin()
  or data->>'leader_id' = public.warroom_current_user_id()
  or data->>'creator_id' = public.warroom_current_user_id()
);

commit;

-- Provision group leaders and their individually-authenticated members through the private Node service.
-- These SECURITY INVOKER functions are executable only by service_role, never browser roles.
begin;

create or replace function public.warroom_leader_create_group_service(
  p_leader_id text,
  p_group_id text,
  p_group_data jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  leader_row public.warroom_users%rowtype;
  group_json jsonb;
  leader_json jsonb;
begin
  if coalesce(p_leader_id,'') = '' or coalesce(p_group_id,'') = ''
     or jsonb_typeof(p_group_data) <> 'object'
     or length(trim(coalesce(p_group_data->>'name',''))) not between 2 and 80 then
    return jsonb_build_object('success',false,'error','INVALID_GROUP');
  end if;
  select * into leader_row from public.warroom_users where id=p_leader_id for update;
  if not found then return jsonb_build_object('success',false,'error','USER_NOT_FOUND'); end if;
  if coalesce((leader_row.data->>'is_blocked')::boolean,false)
     or coalesce((leader_row.data->>'is_active')::boolean,true)=false
     or leader_row.data->>'role'='admin' then
    return jsonb_build_object('success',false,'error','LEADER_INACTIVE');
  end if;
  if nullif(leader_row.data->>'group_id','') is not null
     or exists(select 1 from public.warroom_groups where data->>'leader_id'=p_leader_id) then
    return jsonb_build_object('success',false,'error','ALREADY_IN_GROUP');
  end if;
  if exists(select 1 from public.warroom_groups where id=p_group_id) then
    return jsonb_build_object('success',false,'error','GROUP_ALREADY_EXISTS');
  end if;

  group_json := (p_group_data - 'password' - 'password_hash' - 'secret' - 'token' - 'role' - 'shared_password')
    || jsonb_build_object('id',p_group_id,'leader_id',p_leader_id,'members_count',1,
      'member_ids',jsonb_build_array(p_leader_id),'max_members',6,'status','active');
  insert into public.warroom_groups(id,data,updated_at) values(p_group_id,group_json,now());

  leader_json := (leader_row.data - 'password' - 'password_hash' - 'token' - 'secret')
    || jsonb_build_object('group_id',p_group_id,'role','leader','squad_rank','commander');
  update public.warroom_users set data=leader_json,updated_at=now() where id=p_leader_id;
  return jsonb_build_object('success',true,'group',jsonb_build_object('id',p_group_id)||group_json,
    'user',jsonb_build_object('id',p_leader_id)||leader_json);
exception when unique_violation then
  return jsonb_build_object('success',false,'error','GROUP_ALREADY_EXISTS');
end;
$$;

create or replace function public.warroom_leader_create_group_member_service(
  p_leader_id text,
  p_group_id text,
  p_user_id text,
  p_user_data jsonb,
  p_password text
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  group_row public.warroom_groups%rowtype;
  leader_row public.warroom_users%rowtype;
  member_json jsonb;
  group_json jsonb;
  member_ids_json jsonb;
  national text;
  checksum_sum integer := 0;
  remainder integer;
  member_count integer;
  member_limit integer;
  i integer;
begin
  if coalesce(p_leader_id,'')='' or coalesce(p_group_id,'')='' or coalesce(p_user_id,'')=''
     or p_user_data is null or jsonb_typeof(p_user_data)<>'object' or coalesce(p_password,'')='' then
    return jsonb_build_object('success',false,'error','INVALID_MEMBER');
  end if;
  select * into group_row from public.warroom_groups where id=p_group_id for update;
  if not found then return jsonb_build_object('success',false,'error','GROUP_NOT_FOUND'); end if;
  if group_row.data->>'leader_id' <> p_leader_id then return jsonb_build_object('success',false,'error','FORBIDDEN'); end if;
  select * into leader_row from public.warroom_users where id=p_leader_id for update;
  if not found or coalesce((leader_row.data->>'is_blocked')::boolean,false)
     or coalesce((leader_row.data->>'is_active')::boolean,true)=false then
    return jsonb_build_object('success',false,'error','LEADER_INACTIVE');
  end if;

  national := p_user_data->>'national_code';
  if national !~ '^\d{10}$' or national='0000000000'
     or coalesce(p_user_data->>'first_name','')=''
     or coalesce(p_user_data->>'last_name','')=''
     or coalesce(p_user_data->>'phone','') !~ '^09\d{9}$'
     or length(p_password)<8 or length(p_password)>128
     or p_password ~ '[[:space:]]' or p_password !~ '[A-Za-z]' or p_password !~ '[0-9]' then
    return jsonb_build_object('success',false,'error','INVALID_MEMBER');
  end if;
  for i in 1..9 loop
    checksum_sum := checksum_sum + substring(national from i for 1)::integer * (10-i);
  end loop;
  remainder := checksum_sum % 11;
  if (remainder < 2 and substring(national from 10 for 1)::integer <> remainder)
     or (remainder >= 2 and substring(national from 10 for 1)::integer <> 11-remainder) then
    return jsonb_build_object('success',false,'error','INVALID_MEMBER');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(national,0));
  if exists(select 1 from public.warroom_users u where u.data->>'national_code'=national) then
    return jsonb_build_object('success',false,'error','DUPLICATE_USER');
  end if;

  member_ids_json := case when jsonb_typeof(group_row.data->'member_ids')='array'
    then group_row.data->'member_ids' else '[]'::jsonb end;
  select greatest(coalesce(nullif(group_row.data->>'members_count','')::integer,0),
    jsonb_array_length(member_ids_json),
    (select count(*)::integer from public.warroom_users where data->>'group_id'=p_group_id))
    into member_count;
  member_limit := least(greatest(coalesce(nullif(group_row.data->>'max_members','')::integer,6),1),6);
  if member_count >= member_limit then return jsonb_build_object('success',false,'error','GROUP_FULL'); end if;

  member_json := (p_user_data - 'password' - 'password_hash' - 'secret' - 'token' - 'role' - 'is_admin')
    || jsonb_build_object('id',p_user_id,'group_id',p_group_id,'role','member',
      'is_active',true,'is_blocked',false,'registration_source','leader_created_from_chat');
  insert into public.warroom_users(id,data,updated_at) values(p_user_id,member_json,now());
  insert into public.warroom_credentials(id,data,updated_at)
    values(p_user_id,jsonb_build_object('password_hash',crypt(p_password,gen_salt('bf',12)),
      'password_algorithm','bcrypt','mustChangePassword',true),now());

  if not (member_ids_json ? p_user_id) then member_ids_json := member_ids_json || jsonb_build_array(p_user_id); end if;
  group_json := jsonb_set(group_row.data,'{member_ids}',member_ids_json,true);
  group_json := jsonb_set(group_json,'{members_count}',to_jsonb(member_count+1),true);
  update public.warroom_groups set data=group_json,updated_at=now() where id=p_group_id;
  return jsonb_build_object('success',true,'user',jsonb_build_object('id',p_user_id)||member_json,
    'group',jsonb_build_object('id',p_group_id)||group_json);
exception when unique_violation then
  return jsonb_build_object('success',false,'error','DUPLICATE_USER');
end;
$$;

revoke all on function public.warroom_leader_create_group_service(text,text,jsonb) from public, anon, authenticated;
revoke all on function public.warroom_leader_create_group_member_service(text,text,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.warroom_leader_create_group_service(text,text,jsonb) to service_role;
grant execute on function public.warroom_leader_create_group_member_service(text,text,text,jsonb,text) to service_role;

commit;

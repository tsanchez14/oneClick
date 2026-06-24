-- 003_sync_user_metadata.sql
-- Syncs public.users columns into auth.users.raw_app_meta_data so that
-- tenant_id and role are available as custom JWT claims.

create or replace function public.sync_user_metadata()
returns trigger
language plpgsql
security definer
as $$
begin
  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object(
      'tenant_id', new.tenant_id,
      'role',      new.role
    )
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_user_inserted on public.users;
create trigger on_user_inserted
  after insert on public.users
  for each row
  execute function public.sync_user_metadata();

drop trigger if exists on_user_updated on public.users;
create trigger on_user_updated
  after update on public.users
  for each row
  when (new.tenant_id is distinct from old.tenant_id
     or new.role      is distinct from old.role)
  execute function public.sync_user_metadata();

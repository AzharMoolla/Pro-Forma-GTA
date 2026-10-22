-- ===========================================================================
-- 0002  Project metadata; owner-initiated permanent erasure
-- ===========================================================================
-- Users can create, rename, duplicate and delete their own projects, download everything, and delete their
-- account. Erasure has to remove append-only evidence (scenarios, tracker history, receipt records), so the
-- append-only guards stand aside only inside public.erase_owner_data, which is executable by service_role alone
-- (called from the `account` Edge Function after it verifies the caller's own session). Authenticated users still
-- have no delete grant or policy on any table.
-- ===========================================================================

alter table public.projects add column if not exists meta jsonb not null default '{}'::jsonb;

-- Guards: unchanged, except a DELETE is allowed while the erase function has set the transaction-local flag.
create or replace function public.forbid_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and current_setting('app.erasing', true) = 'on' then
    return old;
  end if;
  raise exception '% is append-only: % is not allowed', tg_table_name, lower(tg_op)
    using errcode = 'insufficient_privilege';
end;
$$;

create or replace function public.receipts_only_soft_remove()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if current_setting('app.erasing', true) = 'on' then
      return old;
    end if;
    raise exception 'receipts are kept for the record: set removed_at instead of deleting' using errcode = 'insufficient_privilege';
  end if;
  if (new.id, new.project_id, new.task_key, new.owner_id, new.storage_path, new.file_name, new.mime_type, new.size_bytes, new.sha256, new.uploaded_at)
     is distinct from
     (old.id, old.project_id, old.task_key, old.owner_id, old.storage_path, old.file_name, old.mime_type, old.size_bytes, old.sha256, old.uploaded_at) then
    raise exception 'receipt records are immutable; only removed_at can change' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

-- Erase one project (p_project) or everything an owner has (p_project null). Returns the receipt file paths so
-- the caller can remove the stored files. Service role only.
create or replace function public.erase_owner_data(p_owner uuid, p_project uuid default null)
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
declare
  paths text[];
begin
  if p_owner is null then
    raise exception 'owner required';
  end if;
  perform set_config('app.erasing', 'on', true);
  select coalesce(array_agg(storage_path), '{}') into paths
    from public.receipts where owner_id = p_owner and (p_project is null or project_id = p_project);
  delete from public.receipts where owner_id = p_owner and (p_project is null or project_id = p_project);
  delete from public.scenarios where owner_id = p_owner and (p_project is null or project_id = p_project);
  delete from public.tracker_history where owner_id = p_owner and (p_project is null or project_id = p_project);
  delete from public.tracker_tasks where owner_id = p_owner and (p_project is null or project_id = p_project);
  delete from public.projects where owner_id = p_owner and (p_project is null or id = p_project);
  perform set_config('app.erasing', 'off', true);
  return query select unnest(paths);
end;
$$;

revoke execute on function public.erase_owner_data(uuid, uuid) from public, anon, authenticated;
grant execute on function public.erase_owner_data(uuid, uuid) to service_role;
revoke execute on function public.forbid_change(), public.receipts_only_soft_remove() from public, anon, authenticated;

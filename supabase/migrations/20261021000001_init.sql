-- ===========================================================================
-- 0001  Projects, append-only scenarios, tracker with history, receipts
-- ===========================================================================
-- Provenance rules live in the database so no client, script or SQL session can skip them:
--   * a scenario's hash must equal SHA-256 of its exact canonical input text  -> CHECK
--   * the stored JSON must be that same canonical text                          -> CHECK
--   * scenarios can never be updated or deleted                                 -> trigger + no RLS policy
--   * every tracker change is logged to an append-only history                  -> trigger
--   * receipt records are immutable except for a soft "removed_at"              -> trigger
-- Every table in public has RLS; every policy pairs TO authenticated with an ownership predicate.
-- ===========================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- helpers

create or replace function public.forbid_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only: % is not allowed', tg_table_name, lower(tg_op)
    using errcode = 'insufficient_privilege';
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- projects

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  demo_id text,                                    -- which demo it started from, if any
  name text not null check (length(trim(name)) > 0),
  project_type text not null,
  draft jsonb not null,                            -- the editable working copy (engine input)
  draft_parent_client_id text,                     -- scenario the draft was branched from
  attributes jsonb not null default '{}'::jsonb,   -- project variables (catalogue switches)
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, demo_id)
);
create index projects_owner_idx on public.projects (owner_id);
create trigger projects_touch before update on public.projects for each row execute function public.touch_updated_at();

alter table public.projects enable row level security;
create policy "owners read projects" on public.projects for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "owners create projects" on public.projects for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "owners update projects" on public.projects for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
-- no delete policy: projects are archived (archived_at), so locked scenarios always keep their parent

-- ---------------------------------------------------------------- scenarios (append-only)

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete restrict,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id text not null,                          -- the id the app shows, e.g. "3-a1b2c3d4"
  parent_client_id text,
  label text not null check (length(trim(label)) > 0),
  note text not null check (length(trim(note)) > 0), -- purpose, recorded before results are viewed
  input_canonical text not null,                    -- exact bytes that were hashed (sorted keys)
  input jsonb not null,
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  engine_version text not null,
  convention_version text not null,
  created_at timestamptz not null default now(),
  unique (project_id, client_id),
  constraint scenarios_hash_matches_input
    check (input_hash = encode(extensions.digest(convert_to(input_canonical, 'UTF8'), 'sha256'), 'hex')),
  constraint scenarios_json_matches_canonical
    check (input = input_canonical::jsonb)
);
create index scenarios_project_idx on public.scenarios (project_id);
create index scenarios_owner_idx on public.scenarios (owner_id);
create trigger scenarios_append_only before update or delete on public.scenarios
  for each row execute function public.forbid_change();

alter table public.scenarios enable row level security;
create policy "owners read scenarios" on public.scenarios for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "owners add scenarios to their projects" on public.scenarios for insert to authenticated
  with check (
    (select auth.uid()) = owner_id
    and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
  );
-- deliberately no update or delete policy

-- ---------------------------------------------------------------- tracker tasks + history

create table public.tracker_tasks (
  project_id uuid not null references public.projects (id) on delete cascade,
  task_key text not null,                           -- "<scope path>|<catalogue id>"
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status text not null default 'todo' check (status in ('todo', 'in-progress', 'done', 'not-applicable')),
  actual numeric(16, 2) check (actual is null or actual >= 0),
  notes text not null default '',
  updated_at timestamptz not null default now(),
  primary key (project_id, task_key)
);
create index tracker_tasks_owner_idx on public.tracker_tasks (owner_id);
create trigger tracker_tasks_touch before update on public.tracker_tasks for each row execute function public.touch_updated_at();

create table public.tracker_history (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  task_key text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  status text not null,
  actual numeric(16, 2),
  notes text not null,
  changed_at timestamptz not null default now()
);
create index tracker_history_task_idx on public.tracker_history (project_id, task_key);
create index tracker_history_owner_idx on public.tracker_history (owner_id);
create trigger tracker_history_append_only before update or delete on public.tracker_history
  for each row execute function public.forbid_change();

-- Runs as the table owner from an unexposed schema, so users never get insert rights on history.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create or replace function private.log_tracker_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.tracker_history (project_id, task_key, owner_id, status, actual, notes)
  values (new.project_id, new.task_key, new.owner_id, new.status, new.actual, new.notes);
  return new;
end;
$$;
create trigger tracker_tasks_log after insert or update on public.tracker_tasks
  for each row execute function private.log_tracker_change();

alter table public.tracker_tasks enable row level security;
create policy "owners read tasks" on public.tracker_tasks for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "owners add tasks" on public.tracker_tasks for insert to authenticated
  with check (
    (select auth.uid()) = owner_id
    and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
  );
create policy "owners update tasks" on public.tracker_tasks for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
  );

alter table public.tracker_history enable row level security;
create policy "owners read task history" on public.tracker_history for select to authenticated
  using ((select auth.uid()) = owner_id);

-- ---------------------------------------------------------------- receipts

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete restrict,
  task_key text not null,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  storage_path text not null unique,                -- "<owner>/<project>/<receipt id>/<file name>"
  file_name text not null check (length(file_name) between 1 and 255),
  mime_type text not null check (mime_type in ('application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'text/csv')),
  size_bytes integer not null check (size_bytes between 1 and 15728640),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_at timestamptz not null default now(),
  removed_at timestamptz,
  constraint receipts_path_is_owners check (split_part(storage_path, '/', 1) = owner_id::text)
);
create index receipts_project_idx on public.receipts (project_id, task_key);
create index receipts_owner_idx on public.receipts (owner_id);

create or replace function public.receipts_only_soft_remove()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
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
create trigger receipts_immutable before update or delete on public.receipts
  for each row execute function public.receipts_only_soft_remove();

alter table public.receipts enable row level security;
create policy "owners read receipts" on public.receipts for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "owners add receipts" on public.receipts for insert to authenticated
  with check (
    (select auth.uid()) = owner_id
    and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
  );
create policy "owners soft-remove receipts" on public.receipts for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- ---------------------------------------------------------------- Data API grants (explicit; anon gets nothing)

revoke all on public.projects, public.scenarios, public.tracker_tasks, public.tracker_history, public.receipts from anon;
grant select, insert, update on public.projects to authenticated;
grant select, insert on public.scenarios to authenticated;
grant select, insert, update on public.tracker_tasks to authenticated;
grant select on public.tracker_history to authenticated;
grant select, insert, update on public.receipts to authenticated;
revoke execute on function public.forbid_change(), public.touch_updated_at(), public.receipts_only_soft_remove(), private.log_tracker_change() from public, anon, authenticated;

-- ---------------------------------------------------------------- receipts bucket (private, size and type limited)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 15728640, array['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'text/csv'])
on conflict (id) do nothing;

create policy "owners upload receipts to their folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "owners read their receipts" on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- no update or delete policies: receipt files are immutable evidence

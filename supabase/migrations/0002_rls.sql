-- Agency Work Management — Row Level Security policies.
--
-- Roles:
--   admin    — full access
--   manager  — full access to projects/clients/tasks/time/invoices
--              (treated like admin for app data, but cannot manage roles).
--   member   — sees projects they're assigned to, edits own tasks/time
--   client   — sees only their client's visible projects/tasks/invoices

-- =======================================================================
-- Helpers (security definer to avoid recursive RLS during checks).
-- =======================================================================
create or replace function public.current_role_v()
returns member_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid())
      in ('admin', 'manager', 'member'),
    false
  )
$$;

create or replace function public.is_admin_or_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid())
      in ('admin', 'manager'),
    false
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) = 'admin',
    false
  )
$$;

-- =======================================================================
-- Enable RLS
-- =======================================================================
alter table public.profiles         enable row level security;
alter table public.clients          enable row level security;
alter table public.projects         enable row level security;
alter table public.project_members  enable row level security;
alter table public.tasks            enable row level security;
alter table public.task_comments    enable row level security;
alter table public.time_logs        enable row level security;
alter table public.invoices         enable row level security;
alter table public.invoice_items    enable row level security;
alter table public.activity_log     enable row level security;

-- =======================================================================
-- Profiles
-- =======================================================================
drop policy if exists "profiles: read self" on public.profiles;
create policy "profiles: read self"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles: read by staff" on public.profiles;
create policy "profiles: read by staff"
  on public.profiles for select
  using (public.is_staff());

drop policy if exists "profiles: client sees client portal members of same client" on public.profiles;
create policy "profiles: client sees client portal members of same client"
  on public.profiles for select
  using (
    public.current_role_v() = 'client'
    and client_id is not null
    and client_id = public.current_client_id()
  );

drop policy if exists "profiles: update self limited" on public.profiles;
create policy "profiles: update self limited"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles: admin manages" on public.profiles;
create policy "profiles: admin manages"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- =======================================================================
-- Clients
-- =======================================================================
drop policy if exists "clients: staff full" on public.clients;
create policy "clients: staff full"
  on public.clients for all
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "clients: members read" on public.clients;
create policy "clients: members read"
  on public.clients for select
  using (public.current_role_v() = 'member');

drop policy if exists "clients: client reads own" on public.clients;
create policy "clients: client reads own"
  on public.clients for select
  using (
    public.current_role_v() = 'client'
    and id = public.current_client_id()
  );

-- =======================================================================
-- Projects
-- =======================================================================
drop policy if exists "projects: admin/manager full" on public.projects;
create policy "projects: admin/manager full"
  on public.projects for all
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "projects: members read assigned" on public.projects;
create policy "projects: members read assigned"
  on public.projects for select
  using (
    public.current_role_v() = 'member'
    and (
      manager_id = auth.uid()
      or exists (
        select 1 from public.project_members pm
        where pm.project_id = projects.id and pm.profile_id = auth.uid()
      )
    )
  );

drop policy if exists "projects: client reads own visible" on public.projects;
create policy "projects: client reads own visible"
  on public.projects for select
  using (
    public.current_role_v() = 'client'
    and is_visible_to_client = true
    and client_id = public.current_client_id()
  );

-- =======================================================================
-- Project members
-- =======================================================================
drop policy if exists "project_members: staff full" on public.project_members;
create policy "project_members: staff full"
  on public.project_members for all
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "project_members: read by member of project" on public.project_members;
create policy "project_members: read by member of project"
  on public.project_members for select
  using (
    public.is_staff()
    and exists (
      select 1 from public.project_members pm
      where pm.project_id = project_members.project_id
        and pm.profile_id = auth.uid()
    )
  );

-- =======================================================================
-- Tasks
-- =======================================================================
drop policy if exists "tasks: admin/manager full" on public.tasks;
create policy "tasks: admin/manager full"
  on public.tasks for all
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "tasks: members read on assigned projects" on public.tasks;
create policy "tasks: members read on assigned projects"
  on public.tasks for select
  using (
    public.current_role_v() = 'member'
    and exists (
      select 1 from public.projects p
      where p.id = tasks.project_id
        and (
          p.manager_id = auth.uid()
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id and pm.profile_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "tasks: members update own assignment" on public.tasks;
create policy "tasks: members update own assignment"
  on public.tasks for update
  using (
    public.current_role_v() = 'member'
    and assignee_id = auth.uid()
  )
  with check (
    public.current_role_v() = 'member'
    and assignee_id = auth.uid()
  );

drop policy if exists "tasks: client reads visible" on public.tasks;
create policy "tasks: client reads visible"
  on public.tasks for select
  using (
    public.current_role_v() = 'client'
    and is_visible_to_client = true
    and exists (
      select 1 from public.projects p
      where p.id = tasks.project_id
        and p.is_visible_to_client = true
        and p.client_id = public.current_client_id()
    )
  );

-- =======================================================================
-- Task comments
-- =======================================================================
drop policy if exists "task_comments: staff full" on public.task_comments;
create policy "task_comments: staff full"
  on public.task_comments for all
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "task_comments: client reads visible" on public.task_comments;
create policy "task_comments: client reads visible"
  on public.task_comments for select
  using (
    public.current_role_v() = 'client'
    and is_visible_to_client = true
    and exists (
      select 1 from public.tasks t
      join public.projects p on p.id = t.project_id
      where t.id = task_comments.task_id
        and t.is_visible_to_client = true
        and p.is_visible_to_client = true
        and p.client_id = public.current_client_id()
    )
  );

drop policy if exists "task_comments: client inserts visible on own tasks" on public.task_comments;
create policy "task_comments: client inserts visible on own tasks"
  on public.task_comments for insert
  with check (
    public.current_role_v() = 'client'
    and is_visible_to_client = true
    and author_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      join public.projects p on p.id = t.project_id
      where t.id = task_comments.task_id
        and t.is_visible_to_client = true
        and p.is_visible_to_client = true
        and p.client_id = public.current_client_id()
    )
  );

-- =======================================================================
-- Time logs
-- =======================================================================
drop policy if exists "time_logs: admin/manager full" on public.time_logs;
create policy "time_logs: admin/manager full"
  on public.time_logs for all
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "time_logs: members manage own" on public.time_logs;
create policy "time_logs: members manage own"
  on public.time_logs for all
  using (
    public.current_role_v() = 'member' and member_id = auth.uid()
  )
  with check (
    public.current_role_v() = 'member' and member_id = auth.uid()
  );

-- =======================================================================
-- Invoices
-- =======================================================================
drop policy if exists "invoices: admin/manager full" on public.invoices;
create policy "invoices: admin/manager full"
  on public.invoices for all
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "invoices: client reads own non-draft" on public.invoices;
create policy "invoices: client reads own non-draft"
  on public.invoices for select
  using (
    public.current_role_v() = 'client'
    and client_id = public.current_client_id()
    and status <> 'draft'
  );

-- =======================================================================
-- Invoice items
-- =======================================================================
drop policy if exists "invoice_items: admin/manager full" on public.invoice_items;
create policy "invoice_items: admin/manager full"
  on public.invoice_items for all
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "invoice_items: client reads via invoice" on public.invoice_items;
create policy "invoice_items: client reads via invoice"
  on public.invoice_items for select
  using (
    public.current_role_v() = 'client'
    and exists (
      select 1 from public.invoices i
      where i.id = invoice_items.invoice_id
        and i.client_id = public.current_client_id()
        and i.status <> 'draft'
    )
  );

-- =======================================================================
-- Activity log
-- =======================================================================
drop policy if exists "activity_log: staff read" on public.activity_log;
create policy "activity_log: staff read"
  on public.activity_log for select
  using (public.is_staff());

drop policy if exists "activity_log: staff insert" on public.activity_log;
create policy "activity_log: staff insert"
  on public.activity_log for insert
  with check (public.is_staff() and (actor_id is null or actor_id = auth.uid()));

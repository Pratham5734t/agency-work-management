-- Agency Work Management — initial schema.
-- Apply against your Supabase project's database (SQL editor or psql).

create extension if not exists "pgcrypto";

-- =======================================================================
-- Enums
-- =======================================================================
do $$ begin
  create type member_role as enum ('admin', 'manager', 'member', 'client');
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_status as enum ('planning', 'active', 'on_hold', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_kind as enum ('seo', 'social', 'ppc', 'content', 'web', 'branding', 'email', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('todo', 'in_progress', 'review', 'done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_priority as enum ('low', 'medium', 'high', 'urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type invoice_status as enum ('draft', 'sent', 'paid', 'overdue', 'cancelled');
exception when duplicate_object then null; end $$;

-- =======================================================================
-- Profiles (1:1 with auth.users). Roles drive RLS.
-- =======================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role member_role not null default 'member',
  full_name text not null default '',
  email text not null default '',
  avatar_url text,
  job_title text,
  hourly_rate numeric(10,2),
  -- For role='client', this links the auth user to a clients row so they
  -- can see their own projects via the client portal.
  client_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_client_idx on public.profiles(client_id);

-- Auto-create a profile when an auth user is created.
-- Default role is 'member'; admins promote/demote via SQL or admin UI.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
begin
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', '');
  insert into public.profiles (id, role, full_name, email, is_active)
  values (new.id, 'member', v_full_name, coalesce(new.email, ''), true)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =======================================================================
-- Clients — agencies serve multiple clients.
-- =======================================================================
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  website text,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  notes text,
  monthly_retainer numeric(12,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);
create index if not exists clients_active_idx on public.clients(is_active, created_at desc);
create index if not exists clients_name_idx on public.clients(lower(name));

-- Now that clients exists, add the FK from profiles.client_id -> clients.id.
do $$ begin
  alter table public.profiles
    add constraint profiles_client_id_fkey
    foreign key (client_id) references public.clients(id) on delete set null;
exception when duplicate_object then null; end $$;

-- =======================================================================
-- Projects — campaigns/engagements for a client.
-- =======================================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  kind project_kind not null default 'other',
  status project_status not null default 'planning',
  description text,
  budget numeric(12,2),
  start_date date,
  end_date date,
  manager_id uuid references public.profiles(id) on delete set null,
  is_visible_to_client boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);
create index if not exists projects_client_idx on public.projects(client_id, created_at desc);
create index if not exists projects_status_idx on public.projects(status, created_at desc);
create index if not exists projects_manager_idx on public.projects(manager_id);

-- Project members (team assigned to a project).
create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (project_id, profile_id)
);
create index if not exists project_members_profile_idx on public.project_members(profile_id);

-- =======================================================================
-- Tasks — kanban board entries.
-- =======================================================================
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  assignee_id uuid references public.profiles(id) on delete set null,
  due_date date,
  estimated_hours numeric(6,2),
  position integer not null default 0,
  is_visible_to_client boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null
);
create index if not exists tasks_project_idx on public.tasks(project_id, status, position);
create index if not exists tasks_assignee_idx on public.tasks(assignee_id, status);
create index if not exists tasks_due_idx on public.tasks(due_date) where status <> 'done';

-- Comments on tasks (and optionally projects for client conversation).
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null check (length(trim(body)) > 0),
  is_visible_to_client boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists task_comments_task_idx on public.task_comments(task_id, created_at);

-- =======================================================================
-- Time logs — billable hours against tasks/projects.
-- =======================================================================
create table if not exists public.time_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  log_date date not null default current_date,
  hours numeric(6,2) not null check (hours > 0 and hours <= 24),
  description text,
  is_billable boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists time_logs_member_idx on public.time_logs(member_id, log_date desc);
create index if not exists time_logs_project_idx on public.time_logs(project_id, log_date desc);
create index if not exists time_logs_task_idx on public.time_logs(task_id);

-- =======================================================================
-- Invoices — agency bills client for project work.
-- =======================================================================
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  client_id uuid not null references public.clients(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  status invoice_status not null default 'draft',
  issue_date date not null default current_date,
  due_date date,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  tax_rate numeric(5,2) not null default 0 check (tax_rate >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  notes text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null
);
create index if not exists invoices_client_idx on public.invoices(client_id, issue_date desc);
create index if not exists invoices_status_idx on public.invoices(status, due_date);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  amount numeric(12,2) not null default 0 check (amount >= 0),
  position integer not null default 0
);
create index if not exists invoice_items_invoice_idx on public.invoice_items(invoice_id, position);

-- =======================================================================
-- Activity log — audit trail of important events.
-- =======================================================================
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_log_entity_idx on public.activity_log(entity_type, entity_id, created_at desc);
create index if not exists activity_log_actor_idx on public.activity_log(actor_id, created_at desc);

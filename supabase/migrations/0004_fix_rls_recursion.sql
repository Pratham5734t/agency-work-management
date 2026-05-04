-- Fix: infinite recursion in RLS policies that query project_members.
--
-- The "project_members: read by member of project" SELECT policy used a
-- subquery against project_members itself, which Postgres re-evaluates under
-- RLS, triggering infinite recursion (SQLSTATE 42P17). The same recursion
-- triggered indirectly when querying projects/tasks (whose member-scoped
-- policies probe project_members).
--
-- Fix: introduce a SECURITY DEFINER helper that checks membership while
-- bypassing RLS, and rewrite the affected policies to call it.

create or replace function public.is_member_of_project(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members
    where project_id = p_project
      and profile_id = auth.uid()
  )
$$;

-- Projects: members read projects they manage or are assigned to.
drop policy if exists "projects: members read assigned" on public.projects;
create policy "projects: members read assigned"
  on public.projects for select
  using (
    public.current_role_v() = 'member'
    and (
      manager_id = auth.uid()
      or public.is_member_of_project(projects.id)
    )
  );

-- Project members: a member can read rows for projects they're a member of.
drop policy if exists "project_members: read by member of project" on public.project_members;
create policy "project_members: read by member of project"
  on public.project_members for select
  using (
    public.is_staff()
    and public.is_member_of_project(project_members.project_id)
  );

-- Tasks: members read tasks on projects they manage or are assigned to.
drop policy if exists "tasks: members read on assigned projects" on public.tasks;
create policy "tasks: members read on assigned projects"
  on public.tasks for select
  using (
    public.current_role_v() = 'member'
    and exists (
      select 1
      from public.projects p
      where p.id = tasks.project_id
        and (
          p.manager_id = auth.uid()
          or public.is_member_of_project(p.id)
        )
    )
  );

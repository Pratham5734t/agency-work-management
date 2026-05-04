# Agency Work Management

A work management system for digital marketing agencies — manage clients, projects/campaigns, tasks (Kanban), team, time tracking, invoices, and a client portal.

Built with **React + Vite + TypeScript**, **Tailwind CSS**, **TanStack Query**, and **Supabase** (Postgres + Auth + Row Level Security).

## Features

- **Auth & roles** — Admin, Manager, Team Member, Client (each scoped via Supabase RLS).
- **Clients** — Add/edit clients with retainer info and contacts.
- **Projects/Campaigns** — Track SEO, Social, PPC, Content, Web, Branding, Email engagements with budget, dates, and team.
- **Tasks (Kanban)** — Drag-and-drop board with To Do / In Progress / Review / Done. Assign owners, set priority and due dates, comment internally or to clients.
- **Team** — Member directory; admins can change roles and link clients.
- **Time tracking** — Log billable/non-billable hours against projects and tasks.
- **Invoicing** — Generate `INV-YYYY-####` invoices, line items, tax, status workflow (draft → sent → paid / overdue).
- **Client portal** — Clients see only what you've explicitly shared: visible projects, visible tasks, and non-draft invoices.
- **Dashboard** — KPIs, recent projects, my upcoming tasks, top clients, quick actions.

## Tech

| Layer       | Choice                                         |
| ----------- | ---------------------------------------------- |
| Frontend    | React 19, Vite, TypeScript, Tailwind v4        |
| Data fetch  | TanStack Query (`@tanstack/react-query`)       |
| Backend     | Supabase (Postgres, Auth, RLS, RPCs)           |
| Forms       | Native + light helpers in `components/ui/`     |
| Routing     | React Router v7                                |

## Quick start

### 1. Create a Supabase project

Go to https://supabase.com → New project. Copy the **Project URL** and **anon key** from Project Settings → API.

### 2. Configure local env

```bash
cp .env.example .env
# Edit .env and fill in:
#   VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
#   VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

### 3. Run the SQL migrations

In the Supabase SQL editor, run each file in order (or via psql):

```
supabase/migrations/0001_init.sql
supabase/migrations/0002_rls.sql
supabase/migrations/0003_invoice_rpcs.sql
supabase/seed.sql       # optional sample clients/projects
```

In **Supabase Auth → Email**, turn **Confirm email** OFF (otherwise signup hangs waiting for an email link).

### 4. Install & run

```bash
npm install
npm run dev      # http://localhost:5173
```

### 5. Promote your first user to admin

Sign up via the app, then in Supabase SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@agency.com';
```

Refresh the app — you'll have full access.

## Roles & access

| Role          | Sees                                                           | Can manage                                                      |
| ------------- | -------------------------------------------------------------- | --------------------------------------------------------------- |
| **admin**     | Everything                                                     | Everything, including roles                                     |
| **manager**   | Everything                                                     | Clients, projects, tasks, time logs, invoices                   |
| **member**    | Their assigned projects + own tasks                            | Their own task statuses + own time logs                         |
| **client**    | Visible projects, visible tasks, non-draft invoices for client | Comment on visible tasks                                        |

To create a client portal user: have the client sign up, then (as admin) on the **Team** page change their role to **Client** and link them to a client record.

## Scripts

```bash
npm run dev        # local dev server
npm run build      # production build (typecheck + Vite build)
npm run lint       # ESLint
npm run preview    # serve production build locally
```

## Project layout

```
src/
  components/        Layout, ProtectedRoute, TaskBoard, Avatar, ui/*
  contexts/          AuthContext
  lib/               supabase client, query client, types, formatters, labels
  pages/             staff pages (Dashboard, Clients, Projects, ...)
  pages/portal/      client portal pages
  queries/           TanStack Query hooks (clients, projects, tasks, ...)
  router.tsx         routing + protected route gating
  App.tsx            providers (Query, Toast, Auth, Router)
  main.tsx
  index.css          Tailwind theme

supabase/
  migrations/        SQL schema, RLS policies, invoice RPCs
  seed.sql           sample clients/projects (optional)
```

## Deployment

The included `netlify.toml` deploys cleanly to Netlify. Set the env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your Netlify site settings.

For Vercel/other static hosts, build with `npm run build` and serve `dist/` with an SPA fallback to `/index.html`.

## License

UNLICENSED — internal use.

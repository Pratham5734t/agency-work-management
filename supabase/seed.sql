-- Optional seed data for local/demo Supabase projects.
--
-- Promote your first user to admin AFTER signing up via the app:
--   update public.profiles set role = 'admin' where email = 'you@example.com';
--
-- Sample clients (safe to re-run):
insert into public.clients (id, name, industry, website, contact_name, contact_email, monthly_retainer)
values
  ('11111111-1111-1111-1111-111111111111', 'Aurora Coffee Co', 'F&B', 'https://aurora.coffee', 'Maya Patel', 'maya@aurora.coffee', 75000),
  ('22222222-2222-2222-2222-222222222222', 'Northwind Realty',  'Real Estate', 'https://northwind.example', 'Sam Lee', 'sam@northwind.example', 120000),
  ('33333333-3333-3333-3333-333333333333', 'PixelPaws Pet Co',  'E-commerce', 'https://pixelpaws.example', 'Aria Gomez', 'aria@pixelpaws.example', 90000)
on conflict (id) do nothing;

-- A starter project for each client (only inserted if no projects exist yet).
insert into public.projects (client_id, name, kind, status, description, budget, start_date)
select '11111111-1111-1111-1111-111111111111', 'Q2 Instagram Growth', 'social', 'active', 'Drive 10k new followers via reels + UGC.', 50000, current_date - 14
where not exists (select 1 from public.projects);

insert into public.projects (client_id, name, kind, status, description, budget, start_date)
select '22222222-2222-2222-2222-222222222222', 'Local SEO Refresh', 'seo', 'planning', 'Audit + GBP optimization for 6 listings.', 80000, current_date
where (select count(*) from public.projects) < 2;

insert into public.projects (client_id, name, kind, status, description, budget, start_date)
select '33333333-3333-3333-3333-333333333333', 'Holiday PPC Campaign', 'ppc', 'active', 'Google + Meta ads for Q4 sales push.', 150000, current_date - 7
where (select count(*) from public.projects) < 3;

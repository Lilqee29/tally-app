-- Real Tally widget task snapshot table for the Supabase-backed WidgetKit path.
-- This is still DEVELOPMENT-ONLY until proper auth/RLS is designed.
--
-- SECURITY WARNING:
-- The anon policies below let any holder of the anon/publishable key read and
-- update every widget task row. That is acceptable only for proving the widget
-- path works. Replace these policies with per-user auth/RLS before release.

create table if not exists public.widget_tasks (
  id text primary key,
  title text not null,
  display_order integer not null default 0,
  dot_color text not null default '#0A84FF',
  today_value text null check (today_value in ('yes', 'no')),
  answered_date date null,
  answered_at timestamptz null,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists widget_tasks_set_updated_at on public.widget_tasks;
create trigger widget_tasks_set_updated_at
before update on public.widget_tasks
for each row
execute function public.set_updated_at();

alter table public.widget_tasks enable row level security;

-- TEMPORARY DEVELOPMENT-ONLY: unsafe public read policy for widget smoke tests.
drop policy if exists "widget_tasks_dev_anon_read" on public.widget_tasks;
create policy "widget_tasks_dev_anon_read"
on public.widget_tasks
for select
to anon
using (true);

-- TEMPORARY DEVELOPMENT-ONLY: unsafe public insert policy for app-to-widget sync.
drop policy if exists "widget_tasks_dev_anon_insert" on public.widget_tasks;
create policy "widget_tasks_dev_anon_insert"
on public.widget_tasks
for insert
to anon
with check (true);

-- TEMPORARY DEVELOPMENT-ONLY: unsafe public update policy for app/widget sync.
drop policy if exists "widget_tasks_dev_anon_update" on public.widget_tasks;
create policy "widget_tasks_dev_anon_update"
on public.widget_tasks
for update
to anon
using (true)
with check (true);

-- TEMPORARY DEVELOPMENT-ONLY: unsafe public delete policy for task removal.
drop policy if exists "widget_tasks_dev_anon_delete" on public.widget_tasks;
create policy "widget_tasks_dev_anon_delete"
on public.widget_tasks
for delete
to anon
using (true);

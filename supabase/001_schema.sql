-- Full schema for Pinoy Recipes on Supabase.
-- If you already ran the schema from the chat, you only need 002_extras.sql.
-- Run in: Supabase Dashboard -> SQL Editor. If the editor cuts off a long paste,
-- run it in smaller pieces (tables, functions, policies).

-- TABLES ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'user' check (role in ('user','admin')),
  favorite_recipe_ids text[] not null default '{}',
  cooked_recipe_count int not null default 0,
  online boolean not null default false,
  last_active timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  slug text,
  description text,
  hero_image_url text not null default '',
  video_loop_url text,
  region text,
  meal_types text[] not null default '{}',
  dietary_tags text[] not null default '{}',
  source_tags text[] not null default '{}',
  prep_time_minutes int,
  cook_time_minutes int,
  base_servings int,
  difficulty text,
  ingredients jsonb not null default '[]',
  steps jsonb not null default '[]',
  key_ingredient_names text[] not null default '{}',
  is_featured boolean not null default false,
  is_trending boolean not null default false,
  created_by_admin_id text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists recipes_status_updated_idx on public.recipes (status, updated_at desc);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_email text,
  user_name text,
  category text not null,
  message text not null,
  status text not null default 'new',
  admin_reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  feedback_id uuid references public.feedback(id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- FUNCTIONS AND TRIGGERS -------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'display_name')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists recipes_touch on public.recipes;
create trigger recipes_touch before update on public.recipes
  for each row execute function public.touch_updated_at();

create or replace function public.increment_cooked() returns void
language sql security definer set search_path = public as $$
  update public.profiles set cooked_recipe_count = cooked_recipe_count + 1 where id = auth.uid()
$$;

create or replace function public.reply_to_feedback(p_id uuid, p_reply text, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;

  update public.feedback
  set admin_reply = p_reply, replied_at = now(), status = p_status
  where id = p_id;

  insert into public.notifications (user_id, title, body, feedback_id)
  select user_id,
         case when p_status = 'resolved' then 'Your feedback was resolved' else 'Update on your feedback' end,
         p_reply,
         p_id
  from public.feedback
  where id = p_id;
end $$;

-- ROW LEVEL SECURITY -----------------------------------------------------
alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.feedback enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "own or admin read" on public.profiles;
drop policy if exists "own update" on public.profiles;
create policy "own or admin read" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "own update" on public.profiles for update using (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (display_name, favorite_recipe_ids, online, last_active) on public.profiles to authenticated;

drop policy if exists "read published or admin" on public.recipes;
drop policy if exists "admin writes" on public.recipes;
create policy "read published or admin" on public.recipes for select using (status = 'published' or public.is_admin());
create policy "admin writes" on public.recipes for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "insert own" on public.feedback;
drop policy if exists "read own or admin" on public.feedback;
drop policy if exists "admin update" on public.feedback;
create policy "insert own" on public.feedback for insert with check (user_id = auth.uid());
create policy "read own or admin" on public.feedback for select using (user_id = auth.uid() or public.is_admin());
create policy "admin update" on public.feedback for update using (public.is_admin());

drop policy if exists "read own" on public.notifications;
drop policy if exists "admin insert" on public.notifications;
drop policy if exists "update own" on public.notifications;
drop policy if exists "delete own" on public.notifications;
create policy "read own" on public.notifications for select using (user_id = auth.uid());
create policy "admin insert" on public.notifications for insert with check (public.is_admin());
create policy "update own" on public.notifications for update using (user_id = auth.uid());
create policy "delete own" on public.notifications for delete using (user_id = auth.uid());
revoke update on public.notifications from authenticated;
grant update (read) on public.notifications to authenticated;

-- REALTIME ---------------------------------------------------------------
alter publication supabase_realtime add table public.notifications, public.feedback, public.profiles;

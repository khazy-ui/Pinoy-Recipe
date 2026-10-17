-- Extra changes the converted app needs on top of the original schema.
-- Safe to run more than once. Run in: Supabase Dashboard -> SQL Editor.

-- 1) Recipe fields the admin form and search screens use.
alter table public.recipes add column if not exists food_type text;
alter table public.recipes add column if not exists pronunciation text;

-- 2) Lets the app create a missing profile row for the signed-in user.
--    The check stops anyone from inserting themselves as an admin.
drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles for insert
  with check (id = auth.uid() and role = 'user');

-- 3) These two functions should only be callable by signed-in users.
revoke execute on function public.increment_cooked() from public, anon;
grant execute on function public.increment_cooked() to authenticated;
revoke execute on function public.reply_to_feedback(uuid, text, text) from public, anon;
grant execute on function public.reply_to_feedback(uuid, text, text) to authenticated;

-- ONE-TIME RESET. Run in: Supabase Dashboard -> SQL Editor. THIS CANNOT BE UNDONE.
-- Consider Dashboard -> Database -> Backups first.

-- 1) Delete every recipe.
delete from public.recipes;

-- 2) Delete all accounts EXCEPT your admin (so you can still log in and add recipes).
--    Replace the email below with yours. Deleting from auth.users cascades to
--    profiles, feedback and notifications (all have ON DELETE CASCADE).
delete from auth.users
where lower(email) <> lower('YOUR-ADMIN-EMAIL@example.com');

-- Optional: to remove EVERY account including yours, drop the WHERE clause above,
-- then sign up again in the app and run:
--   update public.profiles set role = 'admin' where email = 'you@example.com';

-- 3) Check the result.
select (select count(*) from public.recipes)  as recipes,
       (select count(*) from auth.users)      as accounts,
       (select count(*) from public.feedback) as feedback;

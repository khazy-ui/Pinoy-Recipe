# Pinoy-Recipe

## Password security

Passwords are managed by Supabase Auth. Account credentials are stored in
`auth.users` and are cryptographically hashed by Supabase GoTrue; this app never
stores passwords in `public.profiles` or another application table.

Use `supabase.auth.signUp`, `signInWithPassword`, `updateUser`, and
`resetPasswordForEmail` for account-password operations. Do not add a plaintext
password column, client-side password hashing, or the `service_role` key to the
app. Supabase enforces password policy during Auth operations.

## Recipe photo uploads

Run `supabase/004_recipe_images.sql` in the Supabase SQL Editor after the base
schema has been installed. It creates the public `recipe-images` bucket and
limits uploads and deletion to admins.

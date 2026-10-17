// lib/userProfile.ts
//
// Resolves the signed-in user's app profile (public.profiles row), creating it
// if it is somehow missing. `role` drives the admin-vs-user redirect after login.
//
// NOTE (security): this client-side role is for routing/UX only. The real
// access control is enforced by Row Level Security in the database
// (see supabase/migrations). To make someone an admin, run in the SQL editor:
//   update public.profiles set role = 'admin' where email = 'them@example.com';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { UserProfile } from '../types';

/** Display name stored in the user's auth metadata ('' when none). */
export const displayNameOf = (user: User | null | undefined): string =>
  (user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    '') as string;

const rowToProfile = (row: any): UserProfile => ({
  uid: row.id,
  email: row.email ?? undefined,
  displayName: row.display_name ?? undefined,
  role: row.role === 'admin' ? 'admin' : 'user',
  favoriteRecipeIds: row.favorite_recipe_ids ?? [],
  cookedRecipeCount: row.cooked_recipe_count ?? 0,
  createdAt: row.created_at,
});

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const email = user.email ?? undefined;
  const displayName = displayNameOf(user) || undefined;

  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) throw error;
    if (data) return rowToProfile(data);

    // Normally a database trigger creates the row at sign-up. If it's missing
    // (e.g. an account created before the trigger existed), create it now.
    // RLS only allows role = 'user' here, so nobody can self-promote.
    const { data: created, error: insertError } = await supabase
      .from('profiles')
      .insert({ id: user.id, email: email ?? null, display_name: displayName ?? null, role: 'user' })
      .select('*')
      .single();
    if (insertError) throw insertError;
    return rowToProfile(created);
  } catch (err: unknown) {
    // Database unreachable (offline / not configured) — fall back to a local-only
    // profile so login still works. It always uses the safe 'user' role.
    console.warn('[userProfile] Could not read/create profile, using local fallback:', err);
    return {
      uid: user.id,
      email,
      displayName,
      role: 'user',
      favoriteRecipeIds: [],
      cookedRecipeCount: 0,
      createdAt: new Date().toISOString(),
    };
  }
}

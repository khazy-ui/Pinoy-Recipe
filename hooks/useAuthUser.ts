// hooks/useAuthUser.ts
//
// Shared auth state. Firebase had a synchronous `auth.currentUser`; Supabase
// restores its session asynchronously, so this small store keeps the current
// user in one place that every screen can read.
//
// IMPORTANT: the onAuthStateChange callback below must stay synchronous. Calling
// other Supabase methods inside it can deadlock supabase-js.
import { useSyncExternalStore } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

let currentUser: User | null = null;
let initialized = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

supabase.auth.getSession().then(({ data }) => {
  currentUser = data.session?.user ?? null;
  initialized = true;
  emit();
});

supabase.auth.onAuthStateChange((event, session) => {
  // Hourly token refreshes keep the same user; skip them to avoid needless re-renders.
  if (event === 'TOKEN_REFRESHED' && session?.user?.id === currentUser?.id) return;
  currentUser = session?.user ?? null;
  initialized = true;
  emit();
});

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

/** Synchronous read for non-React code (null until the session has loaded). */
export const getCurrentUser = () => currentUser;

export function useAuthUser() {
  const user = useSyncExternalStore(subscribe, () => currentUser);
  const loading = useSyncExternalStore(subscribe, () => !initialized);
  return { user, loading };
}

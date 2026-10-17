// lib/supabase.ts
//
// Single Supabase client for the whole app (replaces lib/firebaseClient.ts).
// Uses the *publishable* (anon) key only. It is safe to ship in the app because
// Row Level Security policies in the database decide what each user can read
// and write. NEVER put the secret / service_role key in the app.
import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Add them to .env and restart Expo with: npx expo start -c'
  );
}

export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing-key', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // React Native has no browser URL to parse
  },
});

// Only refresh tokens while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

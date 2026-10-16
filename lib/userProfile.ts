// lib/userProfile.ts
//
// Resolves the signed-in user's app profile (users/{uid}), creating it on
// first sign-in if it doesn't exist yet. `role` is what drives the
// admin-vs-user redirect right after login.
//
// NOTE (security): this client-side role is convenient for routing/UX only.
// The real access control must live in Firestore Security Rules (and/or
// Firebase custom claims) — never trust this value for anything sensitive.
// To promote an account to admin, either set role: 'admin' on its users/{uid}
// document in the Firebase console, or list its email in
// EXPO_PUBLIC_ADMIN_EMAILS so it's granted admin on first sign-in.
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebaseClient';
import type { UserProfile } from '../types';

const ADMIN_EMAILS = (process.env.EXPO_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

export async function ensureUserProfile(
  uid: string,
  email?: string | null,
  displayName?: string | null
): Promise<UserProfile> {
  const ref = doc(db, 'users', uid);
  const role: UserProfile['role'] =
    email && ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'user';

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return {
        uid,
        favoriteRecipeIds: [],
        cookedRecipeCount: 0,
        ...(snap.data() as Partial<UserProfile>),
      } as UserProfile;
    }

    const profile: UserProfile = {
    uid,
    ...(email ? { email } : {}),
    ...(displayName ? { displayName } : {}),
    role,
    favoriteRecipeIds: [],
    cookedRecipeCount: 0,
    createdAt: new Date().toISOString(),
  };
  await setDoc(ref, profile);
  return profile;
  } catch (err: unknown) {
    // Firestore unreachable (offline / not configured yet) — fall back to a
    // local-only profile so login still works; it'll sync next time online.
    console.warn('[userProfile] Could not read/create Firestore profile, using local fallback:', err);
    const fallback: UserProfile = {
      uid,
      email: email ?? undefined,
      displayName: displayName ?? undefined,
      role,
      favoriteRecipeIds: [],
      cookedRecipeCount: 0,
      createdAt: new Date().toISOString(),
    };
    return fallback;
  }
}

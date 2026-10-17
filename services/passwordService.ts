// services/passwordService.ts
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/** Only email/password accounts have a password. OAuth (e.g. Google) accounts don't. */
export function canChangePassword(user: User | null): boolean {
  if (!user?.email) return false;
  return (
    user.app_metadata?.provider === 'email' ||
    !!user.identities?.some((i) => i.provider === 'email')
  );
}

export function passwordStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.max(1, s) as 1 | 2 | 3 | 4;
}

export type PasswordField = 'current' | 'next' | 'form';
export class PasswordChangeError extends Error {
  field: PasswordField;
  constructor(field: PasswordField, message: string) {
    super(message);
    this.field = field;
  }
}

const isNetworkError = (err: any) =>
  err?.name === 'AuthRetryableFetchError' || /network request failed/i.test(err?.message ?? '');

/** Re-checks the current password, then sets the new one. Throws PasswordChangeError. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const email = data.session?.user.email;
  if (!email) {
    throw new PasswordChangeError('form', 'You need to be signed in to change your password.');
  }

  // Supabase has no "reauthenticate" call, so verify the current password by signing in again.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (reauthError) {
    if (isNetworkError(reauthError)) {
      throw new PasswordChangeError('form', "Couldn't connect. Check your internet and retry.");
    }
    if (reauthError.code === 'over_request_rate_limit') {
      throw new PasswordChangeError('form', 'Too many attempts. Try again in a few minutes.');
    }
    throw new PasswordChangeError('current', "That current password isn't right.");
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    if (isNetworkError(error)) {
      throw new PasswordChangeError('form', "Couldn't connect. Check your internet and retry.");
    }
    switch (error.code) {
      case 'weak_password':
        throw new PasswordChangeError('next', 'Choose a stronger password.');
      case 'same_password':
        throw new PasswordChangeError('next', "Pick a password you haven't used before.");
      case 'over_request_rate_limit':
        throw new PasswordChangeError('form', 'Too many attempts. Try again in a few minutes.');
      case 'reauthentication_needed':
        throw new PasswordChangeError('form', 'For your security, sign in again and retry.');
      default:
        throw new PasswordChangeError('form', error.message ?? "Couldn't update your password.");
    }
  }
}

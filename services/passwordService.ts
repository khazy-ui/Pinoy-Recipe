// services/passwordService.ts
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  type User,
} from 'firebase/auth';
import { auth } from '../lib/firebaseClient';

/** Only email/password accounts have a password. Google sign-in accounts don't. */
export function canChangePassword(user: User | null): boolean {
  return !!user?.email && user.providerData.some((p) => p.providerId === 'password');
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

/** Re-checks the current password, then sets the new one. Throws PasswordChangeError. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new PasswordChangeError('form', 'You need to be signed in to change your password.');
  }
  try {
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  } catch (err: any) {
    switch (err?.code) {
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        throw new PasswordChangeError('current', "That current password isn't right.");
      case 'auth/weak-password':
        throw new PasswordChangeError('next', 'Choose a stronger password.');
      case 'auth/too-many-requests':
        throw new PasswordChangeError('form', 'Too many attempts. Try again in a few minutes.');
      case 'auth/requires-recent-login':
        throw new PasswordChangeError('form', 'For your security, sign in again and retry.');
      case 'auth/network-request-failed':
        throw new PasswordChangeError('form', "Couldn't connect. Check your internet and retry.");
      default:
        throw new PasswordChangeError('form', err?.message ?? "Couldn't update your password.");
    }
  }
}
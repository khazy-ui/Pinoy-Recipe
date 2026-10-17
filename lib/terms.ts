import type { User } from '@supabase/supabase-js';

export const TERMS_VERSION = '2026-10-18';

export function needsTermsAcceptance(user: User): boolean {
  const metadata = user.user_metadata;
  return (
    metadata?.terms_version_required === TERMS_VERSION &&
    metadata?.terms_accepted_version !== TERMS_VERSION
  );
}

import type { User } from '@supabase/supabase-js';

export const TERMS_VERSION = '2026-10-18';
export const PRIVACY_POLICY_VERSION = '2026-10-18';

export function needsAgreementsAcceptance(user: User): boolean {
  const metadata = user.user_metadata;
  return (
    metadata?.terms_version_required === TERMS_VERSION &&
    metadata?.privacy_policy_version_required === PRIVACY_POLICY_VERSION &&
    (metadata?.terms_accepted_version !== TERMS_VERSION ||
      metadata?.privacy_policy_accepted_version !== PRIVACY_POLICY_VERSION)
  );
}

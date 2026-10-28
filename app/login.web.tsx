// app/login.web.tsx
//
// Browser-only admin sign-in page. Expo Router uses this file instead of
// app/login.tsx when running on web, so the mobile login screen is unchanged.
//
// - Real <form> so Enter submits and password managers work
// - Inline messages (Alert.alert does nothing on web)
// - No sign-up: the web portal is for admins only
// - Reset link points at this site, not the mobile app scheme
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ImageBackground, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import type { User } from '@supabase/supabase-js';
import { Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuthUser } from '../hooks/useAuthUser';
import { ensureUserProfile } from '../lib/userProfile';
import { needsAgreementsAcceptance } from '../lib/terms';

const LOGIN_BG = require('../assets/images/loginbg.jpg');

const COLORS = {
  amber: '#D97706',
  amberDark: '#B45309',
  ink: '#3A2A1A',
  muted: '#8A6D4E',
  border: '#E8D9C5',
  page: '#FFF8F0',
  errorBg: '#FEF2F2',
  errorText: '#B91C1C',
  okBg: '#F0FDF4',
  okText: '#15803D',
};

const FONT =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function authErrorMessage(err: any): string {
  if (err?.name === 'AuthRetryableFetchError' || /network request failed|failed to fetch/i.test(err?.message ?? '')) {
    return 'Network error. Check your connection and try again.';
  }
  switch (err?.code as string | undefined) {
    case 'invalid_credentials':
    case 'user_not_found':
      return 'The email or password you entered is incorrect.';
    case 'email_address_invalid':
    case 'validation_failed':
      return 'Please enter a valid email address.';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'user_banned':
      return 'This account has been disabled.';
    case 'email_not_confirmed':
      return 'Please confirm your email first. Check your inbox for the confirmation link.';
    default:
      return 'Unable to sign in. Please try again.';
  }
}

export default function LoginWeb() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const showBrandPanel = width >= 900;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);

  // Signed in admins go to /admin. Anyone else is signed out: this portal is admin-only.
  const routeByRole = async (user: User) => {
    if (needsAgreementsAcceptance(user)) {
      router.replace('/terms');
      return;
    }
    const profile = await ensureUserProfile(user);
    if (profile.role !== 'admin') {
      await supabase.auth.signOut();
      setError('This portal is for administrators only. Please use the mobile app.');
      return;
    }
    router.replace('/admin');
  };

  // Skip login when a saved session already exists.
  const { user: savedUser, loading: sessionLoading } = useAuthUser();
  useEffect(() => {
    if (sessionLoading) return;
    if (savedUser) {
      routeByRole(savedUser).finally(() => setCheckingSession(false));
    } else {
      setCheckingSession(false);
    }
  }, [sessionLoading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setBusy(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      await routeByRole(data.user);
    } catch (err: any) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError('Enter your email above, then click "Forgot password?".');
      return;
    }
    setBusy(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      // Same message whether or not the account exists, so emails can't be probed.
      setNotice(`If an account exists for ${email.trim()}, we've sent a link to reset your password.`);
    } catch (err: any) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = (name: 'email' | 'password'): React.CSSProperties => ({
    width: '100%',
    boxSizing: 'border-box',
    height: 46,
    padding: '0 14px',
    fontSize: 15,
    fontFamily: FONT,
    color: COLORS.ink,
    background: '#fff',
    border: `1px solid ${focused === name ? COLORS.amber : COLORS.border}`,
    boxShadow: focused === name ? '0 0 0 3px rgba(217,119,6,0.18)' : 'none',
    borderRadius: 10,
    outline: 'none',
  });

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.ink,
    marginBottom: 6,
  };

  if (checkingSession) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: COLORS.page,
          fontFamily: FONT,
          color: COLORS.muted,
        }}
      >
        Loading…
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: COLORS.page, fontFamily: FONT }}>
      {showBrandPanel && (
        <ImageBackground
          source={LOGIN_BG}
          style={{ flex: 1, minHeight: '100vh' as any }}
          imageStyle={{ objectPosition: 'top center' } as any}
          resizeMode="cover"
        />
      )}

      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 400,
            background: '#fff',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
            padding: '40px 36px',
            boxShadow: '0 8px 30px rgba(58,42,26,0.08)',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: COLORS.amber,
              marginBottom: 8,
            }}
          >
            Pinoy Recipes
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: COLORS.ink }}>Admin sign in</h1>
          <p style={{ margin: '8px 0 28px', fontSize: 14, lineHeight: 1.5, color: COLORS.muted }}>
            Manage recipes, user feedback and notifications.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <div
                role="alert"
                style={{
                  background: COLORS.errorBg,
                  color: COLORS.errorText,
                  fontSize: 13,
                  padding: '10px 12px',
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                {error}
              </div>
            )}
            {notice && (
              <div
                role="status"
                style={{
                  background: COLORS.okBg,
                  color: COLORS.okText,
                  fontSize: 13,
                  padding: '10px 12px',
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                {notice}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label htmlFor="email" style={labelStyle}>
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="username"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                style={inputStyle('email')}
              />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label htmlFor="password" style={labelStyle}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  style={{ ...inputStyle('password'), paddingRight: 44 }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: 4,
                    top: 3,
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? <Eye size={18} color={COLORS.muted} /> : <EyeOff size={18} color={COLORS.muted} />}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: 24 }}>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={busy}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: FONT,
                  color: COLORS.amber,
                  cursor: busy ? 'default' : 'pointer',
                }}
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={busy}
              style={{
                width: '100%',
                height: 46,
                border: 'none',
                borderRadius: 10,
                background: busy ? COLORS.amberDark : COLORS.amber,
                opacity: busy ? 0.85 : 1,
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                fontFamily: FONT,
                cursor: busy ? 'default' : 'pointer',
              }}
            >
              {busy ? 'Please wait…' : 'Sign in'}
            </button>
          </form>

          <p style={{ margin: '24px 0 0', fontSize: 12, textAlign: 'center', color: COLORS.muted }}>
            Looking for recipes? Download the Pinoy Recipes mobile app.
          </p>
        </div>
      </main>
    </div>
  );
}
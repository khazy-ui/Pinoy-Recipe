// app/_layout.tsx
import { useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useAuthUser } from '../hooks/useAuthUser';
import { ensureUserProfile } from '../lib/userProfile';
import { needsAgreementsAcceptance } from '../lib/terms';
import { useThemeStore } from '../store/useThemeStore'; // ensures theme rehydrates on launch
import '../global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Login and admin screens are always light, so they keep dark icons even in dark mode.
function ThemedStatusBar() {
  const isDark = useThemeStore((s) => s.isDark);
  const segments = useSegments();
  const alwaysLight = segments[0] === 'login' || segments[0] === 'admin';
  return <StatusBar style={isDark && !alwaysLight ? 'light' : 'dark'} />;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading: initializing } = useAuthUser();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  // Tracks which signed-in uid we've already role-routed, so the role check
  // below runs once per session (cold launch with a restored session, or a
  // fresh sign-in) instead of fighting the user's normal in-app navigation
  // on every segment change.
  const routedForUid = useRef<string | null>(null);

  useEffect(() => {
    // Wait until the root navigator has actually mounted before calling
    // router.replace(...), otherwise React throws "Can't perform a state
    // update on a component that hasn't mounted yet" on fast auth resolution.
    if (!rootNavigationState?.key) return;
    if (initializing) return;

    // The reset-password screen is opened from an emailed link, so it must stay
    // reachable while signed out, and must not be role-redirected once the
    // recovery link signs the user in.
    const onResetScreen = segments[0] === 'reset-password';
    const onLoginScreen = segments[0] === 'login';
    const onTermsScreen = segments[0] === 'terms';

    if (!user) {
      routedForUid.current = null;
      if (!onLoginScreen && !onResetScreen) {
        router.replace('/login');
      }
      return;
    }

    if (onResetScreen) return;
    if (needsAgreementsAcceptance(user)) {
      if (!onTermsScreen) router.replace('/terms');
      return;
    }
    if (routedForUid.current === user.id) return;
    routedForUid.current = user.id;

    (async () => {
      // Re-fetch the profile here (rather than trusting any cached value)
      // so a role change made in the database since this user's last sign-in
      // takes effect the moment they reopen the app, without needing to
      // sign out and back in.
      const profile = await ensureUserProfile(user);
      const inAdminSection = segments[0] === 'admin';

      if (profile.role === 'admin' && !inAdminSection) {
        router.replace('/admin');
      } else if (profile.role !== 'admin' && inAdminSection) {
        router.replace('/(tabs)');
      }
    })();
  }, [user, initializing, segments, rootNavigationState?.key]);

  if (initializing) {
    return (
      <View className="flex-1 bg-[#FFF8F0] dark:bg-[#161502] items-center justify-center">
        <ActivityIndicator color="#D97706" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  useThemeStore(); // touch the store so it initializes/rehydrates immediately

  return (
    <QueryClientProvider client={queryClient}>
      <ThemedStatusBar />
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" options={{ gestureEnabled: false }} />
          <Stack.Screen name="terms" options={{ gestureEnabled: false }} />
          <Stack.Screen name="reset-password" options={{ gestureEnabled: false }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="recipe/[id]" options={{ headerShown: false }} />
        </Stack>
      </AuthGate>
    </QueryClientProvider>
  );
}
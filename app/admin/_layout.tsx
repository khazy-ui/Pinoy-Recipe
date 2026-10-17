// app/admin/_layout.tsx
//
// Client-side convenience guard: keeps non-admins out of the /admin screens
// and bounces them back to the regular app. This is a UX nicety only — the
// real enforcement is Row Level Security in the database, since a client check
// can always be bypassed.
//
// Bottom tab bar: Add Recipe, User Feedback, Send Notification, Profile.
// recipe-form is a real route but is hidden from the tab bar via `href: null`.
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { ChefHat, MessageSquare, BellRing, User } from 'lucide-react-native';
import { useAuthUser } from '../../hooks/useAuthUser';
import { ensureUserProfile } from '../../lib/userProfile';
import { subscribeToAllFeedback } from '../../services/feedbackService';
import { startAdminPresence } from '../../services/presenceService';
import { useThemeStore } from '../../store/useThemeStore';
import { responsiveFontSize } from '../../components/ResponsiveText';

export default function AdminLayout() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const { width } = useWindowDimensions();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [newFeedbackCount, setNewFeedbackCount] = useState(0);

  const { user, loading } = useAuthUser();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    let cancelled = false;
    ensureUserProfile(user).then((profile) => {
      if (cancelled) return;
      if (profile.role !== 'admin') {
        router.replace('/(tabs)');
        return;
      }
      setAllowed(true);
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, loading]);

  // Badges the "User Feedback" tab icon with the count of unread feedback.
  useEffect(() => {
    if (!allowed) return;
    return subscribeToAllFeedback((list) =>
      setNewFeedbackCount(list.filter((f) => f.status === 'new').length)
    );
  }, [allowed]);

  // Keeps this admin's online status fresh for the admin list on the Profile tab.
  useEffect(() => {
    if (!allowed || !user) return;
    return startAdminPresence(user.id);
  }, [allowed, user?.id]);

  if (checking || !allowed) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: isDark ? '#161502' : '#FFF8F0' }}
      >
        <ActivityIndicator color="#D97706" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#D97706',
        tabBarInactiveTintColor: isDark ? '#B8A48C' : '#8A6D4E',
        tabBarLabelStyle: { fontSize: responsiveFontSize(10, width) },
        tabBarStyle: {
          // Same colors as the user tab bar.
          backgroundColor: isDark ? '#161502' : '#ede1d3',
          borderTopColor: isDark ? '#3A2A1A' : '#7e776d',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Add Recipe',
          tabBarIcon: ({ color, size }) => <ChefHat size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="feedback"
        options={{
          title: 'User Feedback',
          tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
          tabBarBadge: newFeedbackCount > 0 ? newFeedbackCount : undefined,
        }}
      />
      <Tabs.Screen
        name="notify"
        options={{
          title: 'Send Notification',
          tabBarIcon: ({ color, size }) => <BellRing size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="recipe-form" options={{ href: null }} />
    </Tabs>
  );
}
// app/admin/profile.tsx
//
// "Profile" tab: styled like the user profile (avatar, stat cards, settings
// card) with a dark mode switch, About, and Sign Out.
import { useEffect, useState } from 'react';
import { View, Pressable, Switch, Alert, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTopInset } from '../../hooks/useTopInset';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Lock, LogOut, Moon, Info, UserCircle2 } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuthUser } from '../../hooks/useAuthUser';
import { displayNameOf } from '../../lib/userProfile';
import { getAllRecipesForAdmin } from '../../services/adminRecipeService';
import { subscribeToAllFeedback } from '../../services/feedbackService';
import {
  subscribeToAdmins,
  isAdminOnline,
  lastSeenLabel,
  setAdminOffline,
  type AdminPresence,
} from '../../services/presenceService';
import { canChangePassword } from '../../services/passwordService';
import { useThemeStore } from '../../store/useThemeStore';
import ThemedBackground from '../../components/ThemedBackground';
import { ResponsiveText as Text } from '../../components/ResponsiveText';

export default function AdminProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();
  const { user } = useAuthUser();
  const [newFeedback, setNewFeedback] = useState(0);
  const [admins, setAdmins] = useState<AdminPresence[]>([]);
  const [now, setNow] = useState(Date.now());
  const isDark = useThemeStore((s) => s.isDark);
  const toggleDark = useThemeStore((s) => s.toggleDark);

  const { data: recipes } = useQuery({
    queryKey: ['admin-recipes'],
    queryFn: getAllRecipesForAdmin,
  });

  useEffect(
    () => subscribeToAllFeedback((list) => setNewFeedback(list.filter((f) => f.status === 'new').length)),
    []
  );

  useEffect(() => subscribeToAdmins(setAdmins), []);
  // Re-check who's online every 30s so stale heartbeats flip to offline.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const sortedAdmins = [...admins].sort((a, b) => {
    const ao = isAdminOnline(a, now) ? 0 : 1;
    const bo = isAdminOnline(b, now) ? 0 : 1;
    return ao - bo || a.name.localeCompare(b.name);
  });
  const onlineCount = sortedAdmins.filter((a) => isAdminOnline(a, now)).length;

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          if (user) await setAdminOffline(user.id).catch(() => {});
          await supabase.auth.signOut();
          router.replace('/login');
        },
      },
    ]);
  };

  const displayName = displayNameOf(user) || user?.email?.split('@')[0] || 'Admin';

  return (
    <ThemedBackground>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingTop: topInset + 16, paddingBottom: insets.bottom + 16 }}
      >
        <View className="items-center mt-4 mb-6">
          {user?.user_metadata?.avatar_url ? (
            <Image source={{ uri: user.user_metadata.avatar_url }} style={{ width: 88, height: 88, borderRadius: 44 }} />
          ) : (
            <UserCircle2 size={88} color="#D97706" />
          )}
          <Text className="text-xl font-bold text-[#3A2A1A] dark:text-[#F5EBDD] mt-3">{displayName}</Text>
          {!!user?.email && <Text className="text-sm text-[#8A6D4E] dark:text-[#B8A48C]">{user.email}</Text>}
          <View className="bg-[#D97706] rounded-full px-3 py-1 mt-2">
            <Text className="text-white text-xs font-semibold">Admin</Text>
          </View>
        </View>

        <View className="flex-row gap-3 mb-6">
          <StatCard value={String(recipes?.length ?? 0)} label="RECIPES" color="#D97706" />
          <StatCard value={String(newFeedback)} label="NEW FEEDBACK" color="#3A8A5A" />
        </View>

        <Text className="text-base font-semibold text-[#3A2A1A] dark:text-[#F5EBDD] mb-2">System Settings</Text>
        <View className="bg-white dark:bg-[#2A211A] rounded-2xl overflow-hidden mb-6">
          {canChangePassword(user) && (
            <>
              <Pressable
                onPress={() => router.push('/change-password')}
                className="flex-row items-center justify-between px-4 py-4"
              >
                <View className="flex-row items-center gap-3">
                  <Lock size={18} color="#8A6D4E" />
                  <View>
                    <Text className="text-[#3A2A1A] dark:text-[#F5EBDD] font-medium">Change Password</Text>
                    <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C]">Update your sign-in password</Text>
                  </View>
                </View>
                <ChevronRight size={18} color="#B8A48C" />
              </Pressable>
              <Divider />
            </>
          )}
          <View className="flex-row items-center justify-between px-4 py-4">
            <View className="flex-row items-center gap-3">
              <Moon size={18} color="#8A6D4E" />
              <View>
                <Text className="text-[#3A2A1A] dark:text-[#F5EBDD] font-medium">Dark Mode</Text>
                <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C]">Earthy night look</Text>
              </View>
            </View>
            <Switch value={isDark} onValueChange={toggleDark} trackColor={{ true: '#D97706' }} />
          </View>
          <Divider />
          <Pressable
            onPress={() =>
              Alert.alert('Pinoy Recipes Admin', 'Manage recipes, answer feedback, and notify your users.')
            }
            className="flex-row items-center justify-between px-4 py-4"
          >
            <View className="flex-row items-center gap-3">
              <Info size={18} color="#8A6D4E" />
              <View>
                <Text className="text-[#3A2A1A] dark:text-[#F5EBDD] font-medium">About Pinoy Recipes</Text>
                <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C]">v1.0.0 · Admin</Text>
              </View>
            </View>
          </Pressable>
          <Divider />
          <Pressable onPress={handleSignOut} className="flex-row items-center justify-between px-4 py-4">
            <View className="flex-row items-center gap-3">
              <LogOut size={18} color="#DC2626" />
              <View>
                <Text className="text-[#DC2626] font-medium">Sign Out</Text>
                {!!user?.email && <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C]">{user.email}</Text>}
              </View>
            </View>
          </Pressable>
        </View>

        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-base font-semibold text-[#3A2A1A] dark:text-[#F5EBDD]">Admins</Text>
          <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C]">
            {onlineCount} online · {sortedAdmins.length} total
          </Text>
        </View>
        <View className="bg-white dark:bg-[#2A211A] rounded-2xl overflow-hidden mb-6">
          {sortedAdmins.length === 0 && (
            <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C] px-4 py-4">Loading admins…</Text>
          )}
          {sortedAdmins.map((a, i) => {
            const online = isAdminOnline(a, now);
            const isYou = a.uid === user?.id;
            return (
              <View key={a.uid}>
                {i > 0 && <Divider />}
                <View className="flex-row items-center gap-3 px-4 py-3">
                  <View>
                    <View className="w-10 h-10 rounded-full bg-[#D97706] items-center justify-center">
                      <Text className="text-white font-bold">{a.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View
                      className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#2A211A]"
                      style={{ backgroundColor: online ? '#3A8A5A' : '#B8A48C' }}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[#3A2A1A] dark:text-[#F5EBDD] font-medium" numberOfLines={1}>
                      {a.name}
                      {isYou ? ' (You)' : ''}
                    </Text>
                    {!!a.email && (
                      <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C]" numberOfLines={1}>
                        {a.email}
                      </Text>
                    )}
                  </View>
                  <Text
                    className="text-xs font-medium"
                    style={{ color: online ? '#3A8A5A' : '#8A6D4E' }}
                    numberOfLines={1}
                  >
                    {isYou && online ? 'Online' : lastSeenLabel(a, now)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </ThemedBackground>
  );
}

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View className="flex-1 bg-white dark:bg-[#2A211A] rounded-2xl items-center py-4">
      <Text className="text-lg font-bold" style={{ color }}>
        {value}
      </Text>
      <Text className="text-[10px] text-[#8A6D4E] dark:text-[#B8A48C] mt-1">{label}</Text>
    </View>
  );
}

function Divider() {
  return <View className="h-[1px] bg-[#F5EBDD] dark:bg-[#3A2A1A] ml-14" />;
}
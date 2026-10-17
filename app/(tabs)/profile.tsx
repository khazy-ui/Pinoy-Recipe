// app/(tabs)/profile.tsx
import { useEffect, useState } from 'react';
import { View, Pressable, Switch, Alert, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronRight, LogOut, Moon, Info, UserCircle2, MessageSquare, Lock } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuthUser } from '../../hooks/useAuthUser';
import { displayNameOf } from '../../lib/userProfile';
import { subscribeToCookedCount } from '../../services/cookedRecipeService';
import { canChangePassword } from '../../services/passwordService';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import { useThemeStore } from '../../store/useThemeStore';
import ThemedBackground from '../../components/ThemedBackground';
import { ResponsiveText as Text } from '../../components/ResponsiveText';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuthUser();
  const [cookedRecipeCount, setCookedRecipeCount] = useState(0);
  const isDark = useThemeStore((s) => s.isDark);
  const toggleDark = useThemeStore((s) => s.toggleDark);
  const favoritesCount = useFavoritesStore((s) => s.favoriteIds.length);

  useEffect(() => {
    if (!user) {
      setCookedRecipeCount(0);
      return;
    }

    return subscribeToCookedCount(
      user.id,
      setCookedRecipeCount,
      (error) => {
        console.error('[ProfileScreen] Could not load cooked recipe count:', error);
        Alert.alert("Couldn't load cooking progress", 'Please try again later.');
      }
    );
  }, [user?.id]);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/login');
        },
      },
    ]);
  };

  const displayName = displayNameOf(user) || user?.email?.split('@')[0] || 'Chef';

  return (
    <ThemedBackground>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <View className="items-center mt-4 mb-6">
          {user?.user_metadata?.avatar_url ? (
            <Image source={{ uri: user.user_metadata.avatar_url }} style={{ width: 88, height: 88, borderRadius: 44 }} />
          ) : (
            <UserCircle2 size={88} color="#D97706" />
          )}
          <Text className="text-xl font-bold text-[#3A2A1A] dark:text-[#F5EBDD] mt-3">{displayName}</Text>
          {!!user?.email && (
            <Text
              className="text-sm text-[#8A6D4E] dark:text-[#B8A48C]"
              style={{ alignSelf: 'stretch', textAlign: 'center' }}
            >
              {user.email}
            </Text>
          )}
        </View>

        <View className="flex-row gap-3 mb-6">
          <StatCard value={String(favoritesCount)} label="FAVORITES" color="#D97706" />
          <StatCard value={String(cookedRecipeCount)} label="COOKED" color="#3A8A5A" />
        </View>

        <Text className="text-base font-semibold text-[#3A2A1A] dark:text-[#F5EBDD] mb-2">System Settings</Text>
        <View className="bg-white dark:bg-[#2A211A] rounded-2xl overflow-hidden mb-6">
          <SettingsRow
            icon={<MessageSquare size={18} color="#8A6D4E" />}
            title="Send Feedback"
            subtitle="Suggestions, problems, recipe requests"
            onPress={() => router.push('/feedback')}
          />
          <Divider />
          {canChangePassword(user) && (
            <>
              <SettingsRow
                icon={<Lock size={18} color="#8A6D4E" />}
                title="Change Password"
                subtitle="Update your sign-in password"
                onPress={() => router.push('/change-password')}
              />
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
          <SettingsRow
            icon={<Info size={18} color="#8A6D4E" />}
            title="About Pinoy Recipes"
            subtitle="v1.0.0"
            onPress={() =>
              Alert.alert(
                'Pinoy Recipes',
                'A home for Filipino recipes from every region — cook, save,and add to favorites.'
              )
            }
          />
          <Divider />
          <Pressable onPress={handleSignOut} className="flex-row items-center justify-between px-4 py-4">
            <View className="flex-row items-center gap-3">
              <LogOut size={18} color="#DC2626" />
              <View className="flex-1">
                <Text className="text-[#DC2626] font-medium">Sign Out</Text>
                {!!user?.email && (
                  <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C]" style={{ flexShrink: 1 }}>
                    {user.email}
                  </Text>
                )}
              </View>
            </View>
          </Pressable>
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

function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  badge = 0,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  badge?: number;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center justify-between px-4 py-4">
      <View className="flex-row items-center gap-3">
        {icon}
        <View>
          <Text className="text-[#3A2A1A] dark:text-[#F5EBDD] font-medium">{title}</Text>
          <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C]">{subtitle}</Text>
        </View>
      </View>
      <View className="flex-row items-center gap-2">
        {badge > 0 && (
          <View className="bg-[#D97706] rounded-full min-w-[20px] h-5 px-1.5 items-center justify-center">
            <Text className="text-white text-xs font-bold">{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
        <ChevronRight size={18} color="#B8A48C" />
      </View>
    </Pressable>
  );
}

function Divider() {
  return <View className="h-[1px] bg-[#F5EBDD] dark:bg-[#3A2A1A] ml-14" />;
}
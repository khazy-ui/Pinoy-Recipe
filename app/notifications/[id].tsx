// app/notifications/[id].tsx
import { useEffect, useState } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthUser } from '../../hooks/useAuthUser';
import { useMyNotifications } from '../../hooks/useMyNotifications';
import ScreenHeader from '../../components/ScreenHeader';
import ThemedBackground from '../../components/ThemedBackground';
import { markNotificationRead, formatWhen } from '../../services/feedbackService';
import { ResponsiveText as Text } from '../../components/ResponsiveText';

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthUser();
  const { items, loading } = useMyNotifications(user?.id);


  const notification = items.find((n) => n.id === id) ?? null;

  // Belt-and-braces: mark read here too, in case this screen is opened
  // directly (e.g. from a push notification) without going through the list.
  useEffect(() => {
    if (notification && !notification.read) {
      markNotificationRead(notification.id).catch((err) =>
        console.warn('markNotificationRead failed', err)
      );
    }
  }, [notification?.id, notification?.read]);

  return (
    <ThemedBackground>
      <View className="flex-1">
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="Notification" hideBack />

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#D97706" />
          </View>
        ) : !notification ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-[#8A6D4E] dark:text-[#B8A48C] text-center">
              This notification isn't available anymore.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View className="bg-white dark:bg-[#2A211A] border border-[#F5EBDD] dark:border-[#3D2F22] rounded-2xl p-4">
              <Text className="text-lg font-bold text-[#3A2A1A] dark:text-[#F5EBDD] mb-2">
                {notification.title}
              </Text>
              <Text className="text-base text-[#3A2A1A] dark:text-[#F5EBDD] leading-6">
                {notification.body}
              </Text>
              <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C] mt-4">
                {formatWhen(notification.createdAt)}
              </Text>
            </View>
          </ScrollView>
        )}
      </View>
    </ThemedBackground>
  );
}
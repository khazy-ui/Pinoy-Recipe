// components/NotificationBell.tsx
import { useEffect, useState } from 'react';
import { View, Pressable, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Bell } from 'lucide-react-native';
import { auth } from '../lib/firebaseClient';
import { useMyNotifications } from '../hooks/useMyNotifications';
import { useThemeStore } from '../store/useThemeStore';
import { markNotificationRead, formatWhen, type AppNotification } from '../services/feedbackService';
import { ResponsiveText as Text } from './ResponsiveText';

// How many unread notifications to preview in the dropdown before "See all".
const PREVIEW_COUNT = 6;

export default function NotificationBell() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [open, setOpen] = useState(false);
  const { items, unreadCount } = useMyNotifications(user?.uid);
  const isDark = useThemeStore((s) => s.isDark);
  const iconColor = isDark ? '#F5EBDD' : '#3A2A1A';

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const handleItemPress = (n: AppNotification) => {
    setOpen(false);
    router.push(`/notifications/${n.id}`);
    if (!n.read) {
      markNotificationRead(n.id).catch((err) => console.warn('markNotificationRead failed', err));
    }
  };

  const handleViewAll = () => {
    setOpen(false);
    router.push('/notifications');
  };

  const preview = items.filter((n) => !n.read).slice(0, PREVIEW_COUNT);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={10}
        accessibilityLabel="Notifications"
        className="bg-white dark:bg-[#2A211A] rounded-full p-2.5"
      >
        <Bell size={20} color={iconColor} />
        {unreadCount > 0 && (
          <View className="absolute -top-1 -right-1 bg-[#D97706] rounded-full min-w-[18px] h-[18px] px-1 items-center justify-center border-2 border-[#FFF8F0] dark:border-[#161502]">
            <Text className="text-white text-[10px] font-bold">{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 bg-black/20" onPress={() => setOpen(false)}>
          <View className="px-4 pt-16 items-end">
            <Pressable
              // Swallow taps inside the panel so they don't fall through to the backdrop.
              onPress={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#2A211A] rounded-2xl w-full max-w-[340px] overflow-hidden"
              style={{
                shadowColor: '#000',
                shadowOpacity: 0.15,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 6,
              }}
            >
              <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#F5EBDD] dark:border-[#3D2F22]">
                <Text className="text-base font-bold text-[#3A2A1A] dark:text-[#F5EBDD]">Notifications</Text>
                <Pressable onPress={handleViewAll} hitSlop={8}>
                  <Text className="text-xs font-semibold text-[#D97706]">See all</Text>
                </Pressable>
              </View>

              {preview.length === 0 ? (
                <View className="items-center justify-center py-8 px-4">
                  <Bell size={28} color="#B8A48C" />
                  <Text className="text-[#8A6D4E] dark:text-[#B8A48C] mt-2 text-center text-sm">
                    No new notifications.
                  </Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 360 }}>
                  {preview.map((n) => (
                    <Pressable
                      key={n.id}
                      onPress={() => handleItemPress(n)}
                      className="px-4 py-3 border-b border-[#F5EBDD] dark:border-[#3D2F22]"
                    >
                      <View className="flex-row items-center gap-2 mb-0.5">
                        {!n.read && <View className="w-2 h-2 rounded-full bg-[#D97706]" />}
                        <Text
                          className={`text-[#3A2A1A] dark:text-[#F5EBDD] flex-1 ${
                            n.read ? 'font-medium' : 'font-bold'
                          }`}
                          numberOfLines={1}
                        >
                          {n.title}
                        </Text>
                      </View>
                      <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C]" numberOfLines={2}>
                        {n.body}
                      </Text>
                      <Text className="text-[10px] text-[#8A6D4E] dark:text-[#B8A48C] mt-1">
                        {formatWhen(n.createdAt)}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
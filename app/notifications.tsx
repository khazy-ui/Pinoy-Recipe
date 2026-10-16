// app/notifications.tsx
import { useEffect, useState } from 'react';
import { View, Pressable, FlatList, ActivityIndicator, Alert, Modal } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { BellRing, Check, MoreHorizontal, X } from 'lucide-react-native';
import { auth } from '../lib/firebaseClient';
import { useMyNotifications } from '../hooks/useMyNotifications';
import ScreenHeader from '../components/ScreenHeader';
import ThemedBackground from '../components/ThemedBackground';
import { useThemeStore } from '../store/useThemeStore';
import { ResponsiveText as Text } from '../components/ResponsiveText';
import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
  formatWhen,
  type AppNotification,
} from '../services/feedbackService';

export default function NotificationsScreen() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const { items, loading } = useMyNotifications(user?.uid);
  const isDark = useThemeStore((s) => s.isDark);
  const iconColor = isDark ? '#B8A48C' : '#8A6D4E';
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const closeMenu = () => setMenuOpen(false);

  const toggleItemSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // "Select all" in the menu: checks every notification and switches the
  // menu to show the bulk actions for whatever ends up checked.
  const handleSelectAll = () => {
    setSelectionMode(true);
    setSelectedIds(new Set(items.map((n) => n.id)));
  };

  const exitSelection = () => {
    closeMenu();
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // Tapping navigates to the detail screen and marks the notification read.
  const handlePress = (n: AppNotification) => {
    router.push(`/notifications/${n.id}`);
    if (!n.read) {
      markNotificationRead(n.id).catch((err) => console.warn('markNotificationRead failed', err));
    }
  };

  const handleMarkSelectedRead = () => {
    closeMenu();
    const ids = items.filter((n) => selectedIds.has(n.id) && !n.read).map((n) => n.id);
    if (ids.length > 0) {
      markAllNotificationsRead(ids).catch((err) => console.warn('markAllNotificationsRead failed', err));
    }
    exitSelection();
  };

  // Manual delete: the X button on a single notification.
  const handleDelete = (id: string) => {
    deleteNotification(id).catch((err) => Alert.alert("Couldn't delete", err.message));
  };

  // Delete the checked notifications, after a confirmation.
  const handleDeleteSelected = () => {
    const ids = Array.from(selectedIds);
    closeMenu();
    if (ids.length === 0) return;
    Alert.alert(
      'Delete selected notifications?',
      `This removes ${ids.length} notification${ids.length === 1 ? '' : 's'}. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteAllNotifications(ids).catch((err) => Alert.alert("Couldn't delete", err.message));
            exitSelection();
          },
        },
      ]
    );
  };

  return (
    <ThemedBackground>
      <View className="flex-1">
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader
          title="Notifications"
          right={
            items.length > 0 ? (
              <Pressable
                onPress={() => setMenuOpen(true)}
                hitSlop={10}
                accessibilityLabel="Notification options"
              >
                <MoreHorizontal size={22} color={iconColor} />
              </Pressable>
            ) : undefined
          }
        />

        <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={closeMenu}>
          <Pressable className="flex-1 bg-black/20" onPress={closeMenu}>
            <View className="px-4 pt-16 items-end">
              <Pressable
                onPress={(e) => e.stopPropagation()}
                className="bg-white dark:bg-[#2A211A] rounded-2xl w-48 overflow-hidden"
                style={{
                  shadowColor: '#000',
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 6,
                }}
              >
                {!selectionMode ? (
                  <Pressable onPress={handleSelectAll} className="px-4 py-3">
                    <Text className="text-[#3A2A1A] dark:text-[#F5EBDD] font-medium">Select all</Text>
                  </Pressable>
                ) : (
                  <>
                    <Pressable onPress={handleDeleteSelected} className="px-4 py-3 border-b border-[#F5EBDD] dark:border-[#3D2F22]">
                      <Text className="text-[#DC2626] font-medium">Clear all</Text>
                    </Pressable>
                    <Pressable onPress={handleMarkSelectedRead} className="px-4 py-3 border-b border-[#F5EBDD] dark:border-[#3D2F22]">
                      <Text className="text-[#3A2A1A] dark:text-[#F5EBDD] font-medium">Mark all as read</Text>
                    </Pressable>
                    <Pressable onPress={exitSelection} className="px-4 py-3">
                      <Text className="text-[#8A6D4E] dark:text-[#B8A48C] font-medium">Cancel selection</Text>
                    </Pressable>
                  </>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#D97706" />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(n) => n.id}
            contentContainerStyle={{ padding: 16, paddingTop: 8, flexGrow: 1 }}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center">
                <BellRing size={40} color="#B8A48C" />
                <Text className="text-[#8A6D4E] dark:text-[#B8A48C] mt-3 text-center">
                  No notifications yet. Replies and announcements will show up here.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const selected = selectedIds.has(item.id);
              return (
                <Pressable
                  onPress={() => (selectionMode ? toggleItemSelected(item.id) : handlePress(item))}
                  className="bg-white dark:bg-[#2A211A] border border-[#F5EBDD] dark:border-[#3D2F22] rounded-2xl p-4 mb-2"
                >
                  <View className="flex-row items-center justify-between mb-1">
                    <View className="flex-row items-center gap-2 flex-1">
                      {!item.read && <View className="w-2 h-2 rounded-full bg-[#D97706]" />}
                      <Text
                        className={`text-[#3A2A1A] dark:text-[#F5EBDD] ${
                          item.read ? 'font-medium' : 'font-bold'
                        }`}
                      >
                        {item.title}
                      </Text>
                    </View>
                    {selectionMode ? (
                      <Pressable
                        onPress={() => toggleItemSelected(item.id)}
                        hitSlop={12}
                        accessibilityLabel={selected ? 'Deselect notification' : 'Select notification'}
                        className={`ml-2 w-5 h-5 rounded-md border items-center justify-center ${
                          selected ? 'bg-[#D97706] border-[#D97706]' : 'border-[#B8A48C] bg-transparent'
                        }`}
                      >
                        {selected && <Check size={14} color="#fff" />}
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => handleDelete(item.id)}
                        hitSlop={12}
                        accessibilityLabel="Delete notification"
                        className="ml-2"
                      >
                        <X size={18} color={iconColor} />
                      </Pressable>
                    )}
                  </View>
                  <Text className="text-[#3A2A1A] dark:text-[#F5EBDD]" numberOfLines={3}>
                    {item.body}
                  </Text>
                  <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C] mt-2 text-right">
                    {formatWhen(item.createdAt)}
                  </Text>
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </ThemedBackground>
  );
}
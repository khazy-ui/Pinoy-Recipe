// app/admin/feedback.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Pressable,
  FlatList,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTopInset } from '../../hooks/useTopInset';
import { X } from 'lucide-react-native';
import {
  subscribeToAllFeedback,
  replyToFeedback,
  updateFeedbackStatus,
  formatWhen,
  CATEGORY_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  type Feedback,
  type FeedbackStatus,
} from '../../services/feedbackService';
import { useThemeStore } from '../../store/useThemeStore';
import { ResponsiveText as Text, ResponsiveTextInput as TextInput } from '../../components/ResponsiveText';
import ThemedBackground from '../../components/ThemedBackground';

const STATUSES: FeedbackStatus[] = ['new', 'in_progress', 'resolved'];
type Filter = 'all' | FeedbackStatus;

const PILL_ACTIVE = 'bg-[#D97706] border-[#D97706]';
const PILL_IDLE = 'bg-white dark:bg-[#2A211A] border-[#F5EBDD] dark:border-[#3A2A1A]';

export default function AdminFeedbackScreen() {
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();
  const isDark = useThemeStore((s) => s.isDark);
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  const [selected, setSelected] = useState<Feedback | null>(null);
  const [reply, setReply] = useState('');
  const [status, setStatus] = useState<FeedbackStatus>('in_progress');
  const [busy, setBusy] = useState(false);

  useEffect(
    () =>
      subscribeToAllFeedback((list) => {
        setItems(list);
        setLoading(false);
      }),
    []
  );

  const visible = useMemo(
    () => (filter === 'all' ? items : items.filter((f) => f.status === filter)),
    [items, filter]
  );

  const open = (f: Feedback) => {
    setSelected(f);
    setReply(f.adminReply ?? '');
    setStatus(f.status === 'new' ? 'in_progress' : f.status);
  };

  const close = () => {
    if (!busy) setSelected(null);
  };

  const handleSend = async () => {
    if (!selected) return;
    if (!reply.trim()) {
      Alert.alert('Write a reply', 'Add a message to send to the user.');
      return;
    }
    setBusy(true);
    try {
      await replyToFeedback(selected, reply.trim(), status);
      setSelected(null);
      Alert.alert('Sent', `${selected.userName} has been notified.`);
    } catch (err: any) {
      Alert.alert('Send failed', err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleStatusOnly = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await updateFeedbackStatus(selected.id, status);
      setSelected(null);
    } catch (err: any) {
      Alert.alert('Update failed', err.message);
    } finally {
      setBusy(false);
    }
  };

  const filters: Filter[] = ['all', ...STATUSES];

  return (
    <ThemedBackground>
      <View className="flex-1 px-4" style={{ paddingTop: topInset + 16 }}>
        <Text className="text-xl font-bold text-[#3A2A1A] dark:text-[#F5EBDD] mb-3">User Feedback</Text>

        <View className="flex-row gap-2 mb-3">
          {filters.map((f) => {
            const active = f === filter;
            const count = f === 'all' ? items.length : items.filter((i) => i.status === f).length;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                className={`px-3 py-2 rounded-full border ${active ? PILL_ACTIVE : PILL_IDLE}`}
              >
                <Text
                  className={`text-xs font-medium ${active ? 'text-white' : 'text-[#3A2A1A] dark:text-[#F5EBDD]'}`}
                >
                  {f === 'all' ? 'All' : STATUS_LABELS[f]} ({count})
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator color="#D97706" style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(f) => f.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            ListEmptyComponent={
              <Text className="text-[#8A6D4E] dark:text-[#B8A48C] text-center mt-8">No feedback here yet.</Text>
            }
            renderItem={({ item }) => (
              <Pressable onPress={() => open(item)} className="bg-white dark:bg-[#2A211A] rounded-2xl p-4 mb-2">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-[#3A2A1A] dark:text-[#F5EBDD] font-semibold flex-1" numberOfLines={1}>
                    {item.userName}
                  </Text>
                  <Text className="text-xs font-semibold ml-2" style={{ color: STATUS_COLORS[item.status] }}>
                    {STATUS_LABELS[item.status]}
                  </Text>
                </View>
                <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C] mb-2">
                  {CATEGORY_LABELS[item.category]} · {formatWhen(item.createdAt)}
                </Text>
                <Text className="text-[#3A2A1A] dark:text-[#F5EBDD]" numberOfLines={3}>
                  {item.message}
                </Text>
                {!!item.adminReply && <Text className="text-xs text-[#3A8A5A] mt-2">Replied</Text>}
              </Pressable>
            )}
          />
        )}

        <Modal visible={!!selected} animationType="slide" transparent onRequestClose={close}>
          <KeyboardAvoidingView
            className="flex-1 justify-end bg-black/40"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View
              className="bg-[#FFF8F0] dark:bg-[#161502] rounded-t-3xl p-4"
              style={{ maxHeight: '90%', paddingBottom: insets.bottom + 16 }}
            >
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg font-bold text-[#3A2A1A] dark:text-[#F5EBDD]">
                  Reply to {selected?.userName}
                </Text>
                <Pressable onPress={close} hitSlop={8}>
                  <X size={22} color={isDark ? '#F5EBDD' : '#3A2A1A'} />
                </Pressable>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled">
                {!!selected && (
                  <View className="bg-white dark:bg-[#2A211A] rounded-2xl p-4 mb-4">
                    <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C] mb-1">
                      {selected.userEmail} · {CATEGORY_LABELS[selected.category]} ·{' '}
                      {formatWhen(selected.createdAt)}
                    </Text>
                    <Text className="text-[#3A2A1A] dark:text-[#F5EBDD]">{selected.message}</Text>
                  </View>
                )}

                <Text className="text-sm font-semibold text-[#3A2A1A] dark:text-[#F5EBDD] mb-2">Status</Text>
                <View className="flex-row gap-2 mb-4">
                  {STATUSES.map((s) => {
                    const active = s === status;
                    return (
                      <Pressable
                        key={s}
                        onPress={() => setStatus(s)}
                        className={`px-3 py-2 rounded-full border ${active ? PILL_ACTIVE : PILL_IDLE}`}
                      >
                        <Text
                          className={`text-xs font-medium ${
                            active ? 'text-white' : 'text-[#3A2A1A] dark:text-[#F5EBDD]'
                          }`}
                        >
                          {STATUS_LABELS[s]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text className="text-sm font-semibold text-[#3A2A1A] dark:text-[#F5EBDD] mb-2">
                  Message to the user
                </Text>
                <TextInput
                  value={reply}
                  onChangeText={setReply}
                  placeholder="e.g. We added the Kare-Kare recipe you asked for. It's live in the next update."
                  placeholderTextColor="#B8A48C"
                  multiline
                  maxLength={1000}
                  textAlignVertical="top"
                  className="bg-white dark:bg-[#2A211A] rounded-2xl p-4 min-h-[110px] text-[#3A2A1A] dark:text-[#F5EBDD] mb-4"
                />

                <Pressable
                  onPress={handleSend}
                  disabled={busy}
                  className="bg-[#D97706] rounded-2xl py-4 items-center mb-2"
                >
                  {busy ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-semibold">Send reply and notify user</Text>
                  )}
                </Pressable>
                <Pressable onPress={handleStatusOnly} disabled={busy} className="py-3 items-center">
                  <Text className="text-[#8A6D4E] dark:text-[#B8A48C] font-medium">
                    Save status only (no notification)
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </ThemedBackground>
  );
}
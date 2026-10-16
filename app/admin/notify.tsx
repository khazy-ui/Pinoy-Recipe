// app/admin/notify.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTopInset } from '../../hooks/useTopInset';
import { Check } from 'lucide-react-native';
import { getAllUsers, sendNotificationToUsers, type AppUser } from '../../services/feedbackService';
import ThemedBackground from '../../components/ThemedBackground';
import { ResponsiveText as Text, ResponsiveTextInput as TextInput } from '../../components/ResponsiveText';

type Audience = 'everyone' | 'one';

const INPUT = 'bg-white dark:bg-[#2A211A] text-[#3A2A1A] dark:text-[#F5EBDD]';

export default function AdminNotifyScreen() {
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [audience, setAudience] = useState<Audience>('everyone');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AppUser | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getAllUsers()
      .then(setUsers)
      .catch((err) => Alert.alert("Couldn't load users", err instanceof Error ? err.message : 'Unknown error'))
      .finally(() => setLoadingUsers(false));
  }, []);

  useEffect(() => {
    if (audience !== 'one' || !selected) return;
    if (!users.some((u) => u.uid === selected.uid && u.role !== 'admin')) {
      setSelected(null);
    }
  }, [audience, selected, users]);

  // "Everyone" means regular users; admins aren't notified about their own announcements.
  const everyone = useMemo(() => users.filter((u) => u.role !== 'admin'), [users]);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pool = users.filter((u) => u.role !== 'admin');
    const list = q
      ? pool.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      : pool;
    return list.slice(0, 8);
  }, [users, search]);

  const recipients = audience === 'everyone' ? everyone : selected ? [selected] : [];
  const canSend = title.trim().length > 0 && body.trim().length > 0 && recipients.length > 0 && !sending;

  const doSend = async () => {
    setSending(true);
    try {
      await sendNotificationToUsers(
        recipients.map((u) => u.uid),
        title.trim(),
        body.trim()
      );
      const count = recipients.length;
      setTitle('');
      setBody('');
      setSelected(null);
      setSearch('');
      Alert.alert('Sent', `Notified ${count} user${count === 1 ? '' : 's'}.`);
    } catch (err: any) {
      Alert.alert('Send failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    if (audience === 'everyone') {
      Alert.alert('Notify everyone', `This sends the notification to ${recipients.length} users. Continue?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: doSend },
      ]);
    } else {
      doSend();
    }
  };

  return (
    <ThemedBackground>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          className="px-4"
          contentContainerStyle={{ paddingTop: topInset + 16, paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-xl font-bold text-[#3A2A1A] dark:text-[#F5EBDD] mb-4">Send Notification</Text>

          <Text className="text-sm font-semibold text-[#3A2A1A] dark:text-[#F5EBDD] mb-2">Send to</Text>
          <View className="flex-row gap-2 mb-4">
            {(['everyone', 'one'] as Audience[]).map((a) => {
              const active = a === audience;
              return (
                <Pressable
                  key={a}
                  onPress={() => setAudience(a)}
                  className={`px-4 py-2 rounded-full border ${
                    active
                      ? 'bg-[#D97706] border-[#D97706]'
                      : 'bg-white dark:bg-[#2A211A] border-[#F5EBDD] dark:border-[#3A2A1A]'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      active ? 'text-white' : 'text-[#3A2A1A] dark:text-[#F5EBDD]'
                    }`}
                  >
                    {a === 'everyone' ? 'Everyone' : 'One user'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {audience === 'everyone' ? (
            <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C] mb-4">
              {loadingUsers ? 'Loading users…' : `${everyone.length} users will receive this.`}
            </Text>
          ) : (
            <View className="mb-4">
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name or email"
                placeholderTextColor="#B8A48C"
                autoCapitalize="none"
                className={`${INPUT} rounded-2xl px-4 py-3 mb-2`}
              />
              {loadingUsers ? (
                <ActivityIndicator color="#D97706" />
              ) : matches.length === 0 ? (
                <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C]">No users found.</Text>
              ) : (
                matches.map((u) => {
                  const active = selected?.uid === u.uid;
                  return (
                    <Pressable
                      key={u.uid}
                      onPress={() => setSelected(u)}
                      className={`bg-white dark:bg-[#2A211A] rounded-2xl px-4 py-3 mb-1 flex-row items-center justify-between border ${
                        active ? 'border-[#D97706]' : 'border-transparent'
                      }`}
                    >
                      <View className="flex-1">
                        <Text className="text-[#3A2A1A] dark:text-[#F5EBDD] font-medium">{u.name}</Text>
                        {!!u.email && <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C]">{u.email}</Text>}
                      </View>
                      {active && <Check size={18} color="#D97706" />}
                    </Pressable>
                  );
                })
              )}
            </View>
          )}

          <Text className="text-sm font-semibold text-[#3A2A1A] dark:text-[#F5EBDD] mb-2">Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. New recipes added"
            placeholderTextColor="#B8A48C"
            maxLength={60}
            className={`${INPUT} rounded-2xl px-4 py-3 mb-4`}
          />

          <Text className="text-sm font-semibold text-[#3A2A1A] dark:text-[#F5EBDD] mb-2">Message</Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="What do you want users to know?"
            placeholderTextColor="#B8A48C"
            multiline
            maxLength={1000}
            textAlignVertical="top"
            className={`${INPUT} rounded-2xl p-4 min-h-[120px] mb-5`}
          />

          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            className={`rounded-2xl py-4 items-center ${canSend ? 'bg-[#D97706]' : 'bg-[#D97706]/40'}`}
          >
            {sending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold">
                {audience === 'everyone'
                  ? 'Send to everyone'
                  : selected
                    ? `Send to ${selected.name}`
                    : 'Choose a user'}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedBackground>
  );
}
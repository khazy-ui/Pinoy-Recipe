// app/feedback.tsx
import { useEffect, useState } from 'react';
import {
  View,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { ResponsiveText as Text, ResponsiveTextInput as TextInput } from '../components/ResponsiveText';
import { Stack } from 'expo-router';
import { displayNameOf } from '../lib/userProfile';
import { useAuthUser } from '../hooks/useAuthUser';
import ScreenHeader from '../components/ScreenHeader';
import ThemedBackground from '../components/ThemedBackground';
import {
  submitFeedback,
  CATEGORY_LABELS,
  MAX_FEEDBACK_LENGTH,
  type FeedbackCategory,
} from '../services/feedbackService';

const CATEGORIES = Object.keys(CATEGORY_LABELS) as FeedbackCategory[];
const MIN_LENGTH = 10;

export default function FeedbackScreen() {
  const { user } = useAuthUser();
  const [category, setCategory] = useState<FeedbackCategory>('suggestion');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);


  const tooShort = message.trim().length < MIN_LENGTH;

  const handleSend = async () => {
    if (sending) return;
    if (!user) {
      Alert.alert('Sign in required', 'Sign in again to send feedback.');
      return;
    }
    if (tooShort) {
      Alert.alert('Add more detail', `Write at least ${MIN_LENGTH} characters so we can understand your feedback.`);
      return;
    }
    Keyboard.dismiss();
    setSending(true);
    try {
      await submitFeedback({
        userId: user.id,
        userEmail: user.email ?? '',
        userName: displayNameOf(user) || user.email?.split('@')[0] || 'Chef',
        category,
        message,
      });
      setMessage('');
      Alert.alert('Feedback sent', "Thanks! We'll notify you when there's an update.");
    } catch (err: any) {
      Alert.alert("Couldn't send feedback", err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <ThemedBackground>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="Send feedback" />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <Text className="text-base font-semibold text-[#3A2A1A] dark:text-[#F5EBDD] mb-2">
            What is this about?
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {CATEGORIES.map((c) => {
              const active = c === category;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  className={`px-4 py-2 rounded-full border ${
                    active
                      ? 'bg-[#D97706] border-[#D97706]'
                      : 'bg-white dark:bg-[#2A211A] border-[#F5EBDD] dark:border-[#3D2F22]'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      active ? 'text-white' : 'text-[#3A2A1A] dark:text-[#F5EBDD]'
                    }`}
                  >
                    {CATEGORY_LABELS[c]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Tell us what you'd like to see, or what went wrong"
            placeholderTextColor="#B8A48C"
            multiline
            maxLength={MAX_FEEDBACK_LENGTH}
            textAlignVertical="top"
            className="bg-white dark:bg-[#2A211A] border border-[#F5EBDD] dark:border-[#3D2F22] rounded-2xl p-4 min-h-[140px] text-[#3A2A1A] dark:text-[#F5EBDD]"
          />
          <View className="flex-row justify-between mt-1 mb-4">
            <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C]">
              {tooShort ? `Write at least ${MIN_LENGTH} characters to send.` : ''}
            </Text>
            <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C]">
              {message.length}/{MAX_FEEDBACK_LENGTH}
            </Text>
          </View>

          <Pressable
            onPress={handleSend}
            disabled={sending}
            accessibilityRole="button"
            accessibilityLabel="Send feedback"
            className="rounded-2xl py-4 items-center bg-[#D97706]"
          >
            {sending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold">Send feedback</Text>
            )}
          </Pressable>

          <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C] text-center mt-4">
            Replies from our team will arrive in your Notifications.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedBackground>
  );
}
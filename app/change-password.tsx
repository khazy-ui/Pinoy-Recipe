// app/change-password.tsx
//
// Shared by the user and admin profiles. Follows the app theme (light/dark).
import { useState } from 'react';
import {
  View,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ResponsiveText as Text, ResponsiveTextInput as TextInput } from '../components/ResponsiveText';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { auth } from '../lib/firebaseClient';
import {
  canChangePassword,
  changePassword,
  passwordStrength,
  PasswordChangeError,
} from '../services/passwordService';
import { useThemeStore } from '../store/useThemeStore';
import ThemedBackground from '../components/ThemedBackground';

const STRENGTH_COLORS = ['#DC2626', '#D97706', '#639922', '#3A8A5A'];
const STRENGTH_LABELS = ['Weak', 'Fair', 'Good', 'Strong'];

export default function ChangePasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const ink = isDark ? '#F5EBDD' : '#3A2A1A';

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const strength = passwordStrength(next);
  const canChange = canChangePassword(auth.currentUser);

  const handleSubmit = async () => {
    const e: typeof errors = {};
    if (!current) e.current = 'Enter your current password.';
    if (next.length < 8) e.next = 'Use at least 8 characters.';
    else if (next === current) e.next = "Pick a password you haven't used before.";
    if (confirm !== next) e.confirm = "Passwords don't match.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setBusy(true);
    try {
      await changePassword(current, next);
      Alert.alert('Password updated', 'Use your new password next time you sign in.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      if (err instanceof PasswordChangeError) setErrors({ [err.field]: err.message });
      else setErrors({ form: err?.message ?? "Couldn't update your password." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedBackground safeTop>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row items-center gap-3 mb-5">
            <Pressable
              onPress={() => router.back()}
              accessibilityLabel="Go back"
              className="bg-white dark:bg-[#2A211A] rounded-full p-2"
            >
              <ArrowLeft size={20} color={ink} />
            </Pressable>
            <Text className="text-xl font-bold text-[#3A2A1A] dark:text-[#F5EBDD]">Change password</Text>
          </View>

          {!canChange ? (
            <View className="bg-white dark:bg-[#2A211A] rounded-2xl p-4">
              <Text className="text-[#3A2A1A] dark:text-[#F5EBDD] font-semibold mb-1">No password to change</Text>
              <Text className="text-sm text-[#8A6D4E] dark:text-[#B8A48C]">
                You signed in with Google, so your password is managed by your Google account.
              </Text>
            </View>
          ) : (
            <>
              <PasswordField
                label="Current password"
                value={current}
                onChangeText={(t) => {
                  setCurrent(t);
                  setErrors((x) => ({ ...x, current: undefined, form: undefined }));
                }}
                placeholder="Enter current password"
                error={errors.current}
              />

              <PasswordField
                label="New password"
                value={next}
                onChangeText={(t) => {
                  setNext(t);
                  setErrors((x) => ({ ...x, next: undefined, form: undefined }));
                }}
                placeholder="At least 8 characters"
                error={errors.next}
              >
                <View className="flex-row gap-1 mt-2">
                  {[0, 1, 2, 3].map((i) => (
                    <View
                      key={i}
                      className="flex-1 h-1 rounded-full bg-[#F5EBDD] dark:bg-[#3A2A1A]"
                      style={i < strength ? { backgroundColor: STRENGTH_COLORS[strength - 1] } : undefined}
                    />
                  ))}
                </View>
                <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C] mt-1">
                  {strength > 0
                    ? `${STRENGTH_LABELS[strength - 1]} password`
                    : 'Use 8+ characters with a mix of letters and numbers.'}
                </Text>
              </PasswordField>

              <PasswordField
                label="Confirm new password"
                value={confirm}
                onChangeText={(t) => {
                  setConfirm(t);
                  setErrors((x) => ({ ...x, confirm: undefined, form: undefined }));
                }}
                placeholder="Re-enter new password"
                error={errors.confirm}
              />

              {!!errors.form && <Text className="text-sm text-[#DC2626] mb-3">{errors.form}</Text>}

              <Pressable
                onPress={handleSubmit}
                disabled={busy}
                className="bg-[#D97706] rounded-2xl py-4 items-center mt-2"
              >
                {busy ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold">Update password</Text>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedBackground>
  );
}

function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  children,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  error?: string;
  children?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  return (
    <View className="mb-4">
      <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C] mb-1">{label}</Text>
      <View className="flex-row items-center bg-white dark:bg-[#2A211A] rounded-2xl px-4">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#B8A48C"
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          className="flex-1 py-3 text-[#3A2A1A] dark:text-[#F5EBDD]"
        />
        <Pressable onPress={() => setShow((s) => !s)} hitSlop={8} accessibilityLabel={show ? 'Hide password' : 'Show password'}>
          {show ? <EyeOff size={18} color="#8A6D4E" /> : <Eye size={18} color="#8A6D4E" />}
        </Pressable>
      </View>
      {children}
      {!!error && <Text className="text-xs text-[#DC2626] mt-1">{error}</Text>}
    </View>
  );
}
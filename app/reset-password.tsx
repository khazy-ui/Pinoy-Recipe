// app/reset-password.tsx
//
// Opened from the "reset your password" email. The link comes back to the app
// (deep link) carrying a short-lived recovery session; we load it, then let the
// person choose a new password.
import { useEffect, useState } from 'react';
import { View, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { ResponsiveText as Text, ResponsiveTextInput as TextInput } from '../components/ResponsiveText';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { passwordStrength } from '../services/passwordService';
import ThemedBackground from '../components/ThemedBackground';

// Links look like  app://reset-password#access_token=...&refresh_token=...
// (or ?code=... when PKCE is used). Read both the fragment and the query.
function readLinkParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const parts = [url.split('#')[1], url.split('#')[0].split('?')[1]];
  for (const part of parts) {
    if (!part) continue;
    for (const pair of part.split('&')) {
      const [k, v] = pair.split('=');
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
    }
  }
  return params;
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const url = Linking.useURL();
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!url) return;
    const p = readLinkParams(url);
    (async () => {
      try {
        if (p.access_token && p.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: p.access_token,
            refresh_token: p.refresh_token,
          });
          setStatus(error ? 'invalid' : 'ready');
        } else if (p.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(p.code);
          setStatus(error ? 'invalid' : 'ready');
        } else {
          // Opened without a link (e.g. already handled) — fine if a session exists.
          const { data } = await supabase.auth.getSession();
          setStatus(data.session ? 'ready' : 'invalid');
        }
      } catch {
        setStatus('invalid');
      }
    })();
  }, [url]);

  // If no link ever arrives, don't spin forever.
  useEffect(() => {
    const t = setTimeout(() => setStatus((s) => (s === 'checking' ? 'invalid' : s)), 8000);
    return () => clearTimeout(t);
  }, []);

  const strength = passwordStrength(password);

  const handleSave = async () => {
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert("Passwords don't match", 'Please type the same password twice.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      const msg =
        error.code === 'same_password'
          ? "Pick a password you haven't used before."
          : error.code === 'weak_password'
          ? 'Choose a stronger password.'
          : 'Could not update your password. The link may have expired — request a new one.';
      Alert.alert('Reset failed', msg);
      return;
    }
    Alert.alert('Password updated', 'You are now signed in with your new password.', [
      { text: 'Continue', onPress: () => router.replace('/') },
    ]);
  };

  if (status === 'checking') {
    return (
      <ThemedBackground>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#D97706" />
        </View>
      </ThemedBackground>
    );
  }

  if (status === 'invalid') {
    return (
      <ThemedBackground>
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-xl font-bold text-[#3A2A1A] dark:text-[#F5EBDD] mb-2">Link expired</Text>
          <Text className="text-sm text-[#8A6D4E] dark:text-[#B8A48C] text-center mb-6">
            This reset link is invalid or has expired. Request a new one from the sign-in screen.
          </Text>
          <Pressable onPress={() => router.replace('/login')} className="bg-[#D97706] rounded-xl px-6 py-3">
            <Text className="text-white font-semibold">Back to sign in</Text>
          </Pressable>
        </View>
      </ThemedBackground>
    );
  }

  return (
    <ThemedBackground>
      <KeyboardAvoidingView className="flex-1 justify-center p-6" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text className="text-2xl font-bold text-[#3A2A1A] dark:text-[#F5EBDD] mb-1">Set a new password</Text>
        <Text className="text-sm text-[#8A6D4E] dark:text-[#B8A48C] mb-5">Choose a password you haven't used before.</Text>

        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="New password (8+ characters)"
          placeholderTextColor="#B8A48C"
          className="bg-white dark:bg-[#2A211A] rounded-xl px-4 py-3 text-[#3A2A1A] dark:text-[#F5EBDD] mb-1"
        />
        {password.length > 0 && (
          <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C] mb-3">
            Strength: {['', 'Weak', 'Fair', 'Good', 'Strong'][strength]}
          </Text>
        )}
        <TextInput
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoCapitalize="none"
          placeholder="Confirm new password"
          placeholderTextColor="#B8A48C"
          className="bg-white dark:bg-[#2A211A] rounded-xl px-4 py-3 text-[#3A2A1A] dark:text-[#F5EBDD] mb-5"
        />

        <Pressable
          onPress={handleSave}
          disabled={busy}
          className="bg-[#D97706] rounded-xl py-3 items-center"
          style={{ opacity: busy ? 0.6 : 1 }}
        >
          {busy ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold">Save password</Text>}
        </Pressable>
      </KeyboardAvoidingView>
    </ThemedBackground>
  );
}

// app/login.tsx
//
// A single login screen for everyone. After a successful sign-in with
// email/password, we look up the user's profile in Firestore (creating it on
// first sign-in) and route based on `role`: admins land on /admin, everyone
// else lands on the regular app at /(tabs).
import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { ResponsiveText as Text, ResponsiveTextInput as TextInput } from '../components/ResponsiveText';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth';
import { auth } from '../lib/firebaseClient';
import { ensureUserProfile } from '../lib/userProfile';
import { Eye, EyeOff } from 'lucide-react-native';

const LOGIN_BG = require('../assets/images/loginbg.jpg');

type Mode = 'signIn' | 'signUp';

type Strength = {
  level: 'weak' | 'medium' | 'strong';
  label: string;
  color: string;
  bars: 1 | 2 | 3;
  tip: string;
};

// Scores a password on length and character variety. Shown only while
// creating an account. Firebase itself only enforces a 6-character minimum.
function getPasswordStrength(pw: string): Strength {
  const hasCase = /[a-z]/.test(pw) && /[A-Z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);

  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (hasCase) score++;
  if (hasNumber) score++;
  if (hasSymbol) score++;

  // Suggest the most useful next improvement.
  let tip = 'Great password!';
  if (pw.length < 8) tip = 'Use at least 8 characters.';
  else if (!hasCase) tip = 'Mix uppercase and lowercase letters.';
  else if (!hasNumber) tip = 'Add a number.';
  else if (!hasSymbol) tip = 'Add a symbol like ! @ # $.';
  else if (pw.length < 12) tip = 'Make it 12+ characters for extra strength.';

  if (pw.length < 6 || score <= 2) {
    return { level: 'weak', label: 'Weak', color: '#DC2626', bars: 1, tip };
  }
  if (score === 3) {
    return { level: 'medium', label: 'Medium', color: '#F59E0B', bars: 2, tip };
  }
  return { level: 'strong', label: 'Strong', color: '#16A34A', bars: 3, tip };
}

// Maps Firebase Auth error codes to plain-language messages. Modern Firebase
// SDKs return 'auth/invalid-credential' for BOTH a wrong password and an
// unregistered email (a deliberate security choice, to avoid letting an
// attacker tell which emails are registered) — so both are handled the same
// user-facing way here.
function getAuthErrorMessage(code: string | undefined, mode: Mode): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'The email or password you entered is incorrect. Please try again.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact support if you think this is a mistake.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/weak-password':
      return 'Please choose a stronger password (at least 6 characters).';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return mode === 'signIn'
        ? 'Unable to sign in. Please try again.'
        : 'Unable to create your account. Please try again.';
  }
}

export default function LoginScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Send a signed-in user to the right place based on their role.
  const routeByRole = async (user: User) => {
    const profile = await ensureUserProfile(user.uid, user.email, user.displayName);
    router.replace(profile.role === 'admin' ? '/admin' : '/(tabs)');
  };

  // Already signed in from a previous session? Skip straight past login.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await routeByRole(user);
      }
      setCheckingSession(false);
    });
    return unsub;
  }, []);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Enter your email first', 'Please enter your email address to receive a password reset link.');
      return;
    }
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      // Same message whether or not the account exists, so emails can't be probed.
      Alert.alert(
        'Check your email',
        `If an account exists for ${email.trim()}, we've sent a link to reset your password.`
      );
    } catch (err: any) {
      const code = err?.code as string | undefined;
      const message =
        code === 'auth/invalid-email'
          ? 'Please enter a valid email address.'
          : code === 'auth/too-many-requests'
          ? 'Too many attempts. Please wait a moment and try again.'
          : code === 'auth/network-request-failed'
          ? 'Network error. Check your connection and try again.'
          : 'Unable to send the reset email. Please try again.';
      Alert.alert('Reset failed', message);
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing info', 'Please enter both email and password.');
      return;
    }
    setBusy(true);
    try {
      const cred =
        mode === 'signIn'
          ? await signInWithEmailAndPassword(auth, email.trim(), password)
          : await createUserWithEmailAndPassword(auth, email.trim(), password);
      await routeByRole(cred.user);
    } catch (err: any) {
      Alert.alert('Sign-in failed', getAuthErrorMessage(err?.code, mode));
    } finally {
      setBusy(false);
    }
  };

  if (checkingSession) {
    return (
      <ImageBackground source={LOGIN_BG} style={{ flex: 1 }} resizeMode="cover">
        <StatusBar style="dark" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#D97706" />
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={LOGIN_BG} style={{ flex: 1 }} resizeMode="cover">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingTop: height * 0.15, // keep the form below the logo in the background image
            paddingBottom: 32,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="transparent rounded-2xl">
            <Text className="text-5xl font-bold text-[##0f23fa] mb-2 text-center">Kamusta!</Text>
            <Text className="text-sm text-[#8A6D4E] mb-6 text-center">
              {mode === 'signIn'
                ? 'Sign in to save favorites and manage recipes'
                : 'Create an account to get started'}
            </Text>

            <View className="gap-3 mb-4">
              <TextInput
                placeholder="Email"
                placeholderTextColor="#B8A48C"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                className="bg-white border border-[#F0E4D4] rounded-2xl px-4 py-4 text-[#3A2A1A]"
              />
              <View className="bg-white border border-[#F0E4D4] rounded-2xl flex-row items-center">
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#B8A48C"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  value={password}
                  onChangeText={setPassword}
                  className="flex-1 px-4 py-4 text-[#3A2A1A]"
                />
                <Pressable
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  onPress={() => setShowPassword((visible) => !visible)}
                  className="px-4"
                >
                  {showPassword ? <Eye size={20} color="#8A6D4E" /> : <EyeOff size={20} color="#8A6D4E" />}
                </Pressable>
              </View>

              {mode === 'signUp' && password.length > 0 && (
                <View accessibilityLiveRegion="polite">
                  <View className="flex-row gap-2 mb-2">
                    {[1, 2, 3].map((i) => (
                      <View
                        key={i}
                        className="flex-1 h-1.5 rounded-full"
                        style={{ backgroundColor: i <= strength.bars ? strength.color : '#F0E4D4' }}
                      />
                    ))}
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs font-semibold" style={{ color: strength.color }}>
                      {strength.label}
                    </Text>
                    <Text className="text-xs text-[#8A6D4E] flex-1 text-right ml-3">{strength.tip}</Text>
                  </View>
                </View>
              )}

              {mode === 'signIn' && (
                <Pressable
                  disabled={busy}
                  onPress={handleForgotPassword}
                  accessibilityRole="button"
                  className="self-center mt-1 mb-2"
                >
                  <Text className="text-[#D97706] text-sm font-medium">Forgot password?</Text>
                </Pressable>
              )}
            </View>

            <Pressable
              disabled={busy}
              onPress={handleEmailSubmit}
              className="bg-[#D97706] rounded-2xl py-4 items-center mb-3"
            >
              {busy ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  {mode === 'signIn' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </Pressable>

            <Pressable onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')} className="mb-6">
              <Text className="text-[#D97706] text-sm text-center">
                {mode === 'signIn' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}
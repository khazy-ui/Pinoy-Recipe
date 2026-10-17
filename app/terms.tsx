import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ResponsiveText as Text } from '../components/ResponsiveText';
import { useAuthUser } from '../hooks/useAuthUser';
import { supabase } from '../lib/supabase';
import { PRIVACY_POLICY_VERSION, TERMS_VERSION } from '../lib/terms';
import { ensureUserProfile } from '../lib/userProfile';

export default function TermsScreen() {
  const router = useRouter();
  const { user } = useAuthUser();
  const [busy, setBusy] = useState(false);

  const acceptTerms = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to accept the terms.');
      router.replace('/login');
      return;
    }

    setBusy(true);
    try {
      const acceptedAt = new Date().toISOString();
      const { error } = await supabase.auth.updateUser({
        data: {
          terms_accepted_version: TERMS_VERSION,
          privacy_policy_accepted_version: PRIVACY_POLICY_VERSION,
          terms_accepted_at: acceptedAt,
          privacy_policy_accepted_at: acceptedAt,
        },
      });
      if (error) throw error;

      const profile = await ensureUserProfile(user);
      router.replace(profile.role === 'admin' ? '/admin' : '/(tabs)');
    } catch (error) {
      console.error('[TermsScreen] Could not save terms acceptance:', error);
      Alert.alert('Unable to save', 'Your acceptance could not be saved. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const declineTerms = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/login');
    } catch (error) {
      console.error('[TermsScreen] Could not sign out after terms were declined:', error);
      Alert.alert('Unable to sign out', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-[#FFF8F0] dark:bg-[#161502] px-5 pt-14 pb-6">
      <Text className="text-2xl font-bold text-[#3A2A1A] dark:text-[#F5EBDD] mb-2">
        Terms and Conditions
      </Text>
      <Text className="text-sm text-[#8A6D4E] dark:text-[#B8A48C] mb-5">
        Please review both documents before continuing to Pinoy Recipes.
      </Text>

      <ScrollView className="flex-1 bg-white dark:bg-[#2A211A] rounded-2xl px-4 py-3 mb-5">
        <Text className="text-xl font-bold text-[#3A2A1A] dark:text-[#F5EBDD] mb-3">
          Terms and Conditions
        </Text>
        <TermSection title="Using the app">
          Pinoy Recipes provides recipes and cooking features for personal, non-commercial use.
          You agree to use the app lawfully and not interfere with its operation or other users.
        </TermSection>
        <TermSection title="Recipes and food safety">
          Recipes are provided for general information and may need adjustment for your ingredients,
          equipment, and dietary needs. You are responsible for safe food handling, checking
          ingredients for allergens, and deciding whether a recipe is suitable for you.
        </TermSection>
        <TermSection title="Accounts">
          Keep your sign-in details secure and provide accurate account information. You are
          responsible for activity carried out through your account. Contact the app team if you
          believe your account has been used without permission.
        </TermSection>
        <TermSection title="Content and availability">
          App content may be updated or removed, and the app may occasionally be unavailable.
          Recipe content and other materials belong to their respective owners and may not be
          copied or redistributed without permission.
        </TermSection>
        <TermSection title="Changes">
          These terms may be updated as the app changes. If updated terms require acceptance, you
          will be asked to review them before continuing to use the app.
        </TermSection>

        <Text className="text-xl font-bold text-[#3A2A1A] dark:text-[#F5EBDD] mb-3 mt-2">
          Privacy Policy
        </Text>
        <TermSection title="Information we collect">
          We process the information you provide when creating and using your account, such as your
          email address and profile details. The app may also store your favorites, cooking
          progress, and feedback that you submit.
        </TermSection>
        <TermSection title="How information is used">
          Account information is used to sign you in and maintain your profile. Favorites and
          cooking progress support app features, and submitted feedback is used to respond to
          suggestions or problems and improve the app.
        </TermSection>
        <TermSection title="Storage and service providers">
          Account and app data are handled by the app's backend service provider, Supabase. Data
          may be processed or stored on its infrastructure to provide the service. Please consult
          Supabase's current privacy information for details about its handling of service data.
        </TermSection>
        <TermSection title="Your choices and data">
          You may stop using the app and sign out at any time. To request access to, correction of,
          or deletion of account information, contact the app team through its available support
          channel. Some data may need to be retained where required by law or for legitimate
          operational purposes.
        </TermSection>
        <TermSection title="Policy updates">
          We may update this policy when the app or its data practices change. If an update
          requires renewed acceptance, the app will ask you to review the updated policy.
        </TermSection>
      </ScrollView>

      <Pressable
        disabled={busy}
        onPress={acceptTerms}
        accessibilityRole="button"
        className="bg-[#D97706] rounded-2xl py-4 items-center mb-3"
      >
        {busy ? <ActivityIndicator color="white" /> : (
          <Text className="text-white font-semibold text-base">I Agree to Both and Continue</Text>
        )}
      </Pressable>
      <Pressable
        disabled={busy}
        onPress={declineTerms}
        accessibilityRole="button"
        className="py-3 items-center"
      >
        <Text className="text-[#8A6D4E] dark:text-[#B8A48C] text-sm">Decline and sign out</Text>
      </Pressable>
    </View>
  );
}

function TermSection({ title, children }: { title: string; children: string }) {
  return (
    <View className="mb-4">
      <Text className="text-base font-semibold text-[#3A2A1A] dark:text-[#F5EBDD] mb-1">
        {title}
      </Text>
      <Text className="text-sm leading-6 text-[#5B4634] dark:text-[#D6C4AF]">{children}</Text>
    </View>
  );
}

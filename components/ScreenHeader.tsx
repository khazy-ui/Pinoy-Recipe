// components/ScreenHeader.tsx
import type { ReactNode } from 'react';
import { View, Pressable } from 'react-native';
import { useTopInset } from '../hooks/useTopInset';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useThemeStore } from '../store/useThemeStore';
import { ResponsiveText as Text } from './ResponsiveText';

export default function ScreenHeader({
  title,
  right,
  onBack,
  hideBack = false,
}: {
  title: string;
  right?: ReactNode;
  onBack?: () => void;
  hideBack?: boolean;
}) {
  const router = useRouter();
  const topInset = useTopInset();
  const isDark = useThemeStore((s) => s.isDark);

  return (
    <View
      className="flex-row items-center justify-between px-4 pb-2"
      style={{ paddingTop: topInset + 6 }}
    >
      <View className="flex-row items-center gap-3">
        {!hideBack && (
          <Pressable
            onPress={() => (onBack ? onBack() : router.back())}
            hitSlop={8}
            accessibilityLabel="Go back"
            className="bg-white dark:bg-[#2A211A] rounded-full p-2"
          >
            <ArrowLeft size={18} color={isDark ? '#F5EBDD' : '#3A2A1A'} />
          </Pressable>
        )}
        <Text className="text-lg font-bold text-[#3A2A1A] dark:text-[#F5EBDD]">{title}</Text>
      </View>
      {right}
    </View>
  );
}
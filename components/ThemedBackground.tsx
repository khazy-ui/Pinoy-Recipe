// components/ThemedBackground.tsx
//
// Full-screen background: light.png in light mode, dark.png in dark mode.
// A soft tint sits between the image and the content so the pattern stays a
// gentle texture instead of competing with text (this is what keeps it easy
// on the eyes). Raise the alpha for a calmer look, lower it to show more pattern.
//
// If your image files are .jpg instead of .png, change the two require() lines.
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useTopInset } from '../hooks/useTopInset';
import { useThemeStore } from '../store/useThemeStore';

const LIGHT_BG = require('../assets/images/light.jpg');
const DARK_BG = require('../assets/images/dark.jpg');

const LIGHT_BASE = '#FFF8F0';
const DARK_BASE = '#161502';
const LIGHT_TINT = 'rgba(255, 248, 240, 0.40)';
const DARK_TINT = 'rgba(22, 21, 2, 0.72)';

type Props = {
  children: ReactNode;
  /** Always use the light background, even when the app is in dark mode (used by admin screens). */
  forceLight?: boolean;
  /** Push content below the status bar (clock, battery). The background still fills the whole screen. */
  safeTop?: boolean;
};

export default function ThemedBackground({ children, forceLight = false, safeTop = false }: Props) {
  const topInset = useTopInset();
  const storeDark = useThemeStore((s) => s.isDark);
  const dark = storeDark && !forceLight;

  return (
    <View style={{ flex: 1, backgroundColor: dark ? DARK_BASE : LIGHT_BASE }}>
      <Image
        source={dark ? DARK_BG : LIGHT_BG}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: dark ? DARK_TINT : LIGHT_TINT }]}
      />
      <View style={{ flex: 1, paddingTop: safeTop ? topInset : 0 }}>{children}</View>
    </View>
  );
}
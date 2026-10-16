// hooks/useTopInset.ts
import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Height of the system status bar area (clock, signal, battery).
 * Some Android phones draw app content underneath the status bar without
 * reporting an inset, so we also fall back to the platform's status bar height
 * and use whichever is larger.
 */
export function useTopInset(): number {
  const insets = useSafeAreaInsets();
  const androidBar = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  return Math.max(insets.top, androidBar);
}
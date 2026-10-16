// store/useThemeStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';

interface ThemeStore {
  isDark: boolean;
  toggleDark: () => void;
  setDark: (value: boolean) => void;
}

// Single shared toggle for the whole app — the user tabs and the admin
// section both read className `dark:` variants, which NativeWind applies
// globally once colorScheme.set() runs, so there's nothing admin-specific
// to wire up separately.
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      isDark: false,

      toggleDark: () =>
        set((state) => {
          const next = !state.isDark;
          colorScheme.set(next ? 'dark' : 'light');
          return { isDark: next };
        }),

      setDark: (value: boolean) => {
        colorScheme.set(value ? 'dark' : 'light');
        set({ isDark: value });
      },
    }),
    {
      name: 'pinoy-recipes-theme',
      storage: createJSONStorage(() => AsyncStorage),
      // On rehydrate (app launch), re-apply the saved preference to
      // NativeWind — persist only restores our own state, not the
      // library's internal colorScheme.
      //
      // Deferred with setTimeout(0): onRehydrateStorage can fire before the
      // component tree has finished mounting, and colorScheme.set() itself
      // triggers a React state update internally — calling it synchronously
      // here can hit "state update on a component that hasn't mounted yet."
      // Pushing it to the next tick lets the current mount finish first.
      onRehydrateStorage: () => (state) => {
        if (state) {
          setTimeout(() => {
            colorScheme.set(state.isDark ? 'dark' : 'light');
          }, 0);
        }
      },
    }
  )
);
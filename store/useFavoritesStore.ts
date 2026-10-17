// store/useFavoritesStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../hooks/useAuthUser';

interface FavoritesStore {
  favoriteIds: string[];
  toggleFavorite: (recipeId: string) => void;
  isFavorite: (recipeId: string) => boolean;
  hydrateFromServer: (ids: string[]) => void;
}

// Local-first: toggling favorites works fully offline via AsyncStorage,
// then best-effort syncs to the user's own profile row (profiles.favorite_recipe_ids)
// when online. Row Level Security only lets a user update their own profile, and
// recipes stay admin-write-only.
export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      favoriteIds: [],

      toggleFavorite: (recipeId: string) => {
        const current = get().favoriteIds;
        const next = current.includes(recipeId)
          ? current.filter((id) => id !== recipeId)
          : [...current, recipeId];

        set({ favoriteIds: next });

        const uid = getCurrentUser()?.id;
        if (uid) {
          void (async () => {
            try {
              await supabase.from('profiles').update({ favorite_recipe_ids: next }).eq('id', uid);
            } catch {
              // Swallow network errors — local state is already updated,
              // and this will retry on next mutation.
            }
          })();
        }
      },

      isFavorite: (recipeId: string) => get().favoriteIds.includes(recipeId),

      hydrateFromServer: (ids: string[]) => set({ favoriteIds: ids }),
    }),
    {
      name: 'pinoy-recipes-favorites',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

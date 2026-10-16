// store/useFavoritesStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseClient';

interface FavoritesStore {
  favoriteIds: string[];
  toggleFavorite: (recipeId: string) => void;
  isFavorite: (recipeId: string) => boolean;
  hydrateFromServer: (ids: string[]) => void;
}

// Local-first: toggling favorites works fully offline via AsyncStorage,
// then best-effort syncs to the user's profile doc in Firestore when online.
// Writes here only ever touch the CURRENT user's own profile document
// (users/{uid}.favoriteRecipeIds) — never recipe documents themselves,
// which stay admin-write-only per the Security Rules.
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

        const uid = auth.currentUser?.uid;
        if (uid) {
          setDoc(
            doc(db, 'users', uid),
            { favoriteRecipeIds: next },
            { merge: true }
          ).catch(() => {
            // Swallow network errors — local state is already updated,
            // and this will retry on next mutation or app foreground.
          });
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

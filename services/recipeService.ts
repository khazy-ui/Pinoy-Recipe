// services/recipeService.ts
// Read-only data access layer for mobile clients.
// All writes are intentionally NOT exposed here — enforced again server-side by Security Rules.

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  getDoc,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebaseClient';
import type { Recipe, Region, MealType, SearchFilters } from '../types';
import { MOCK_RECIPES, getMockRecipeById } from '../constants/mockRecipes';

const RECIPES_COLLECTION = 'recipes';
const PAGE_SIZE = 20;

// Only ever query published recipes — drafts/archived are invisible to the client
// even if security rules were ever misconfigured (defense in depth).
const publishedOnly = () => where('status', '==', 'published');

/**
 * Runs a live Firestore query. The bundled app content (constants/mockRecipes.ts)
 * is used ONLY when Firestore can't be reached (offline / error). An empty
 * result is a real answer: it means the admin has no published recipes (for
 * example after deleting them), so we must not bring the built-in samples back.
 */
async function withMockFallback<T extends unknown[]>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.warn('[recipeService] Falling back to built-in recipe content:', err);
    return fallback();
  }
}

export async function getFeaturedRecipes(): Promise<Recipe[]> {
  return withMockFallback(
    async () => {
      const q = query(
        collection(db, RECIPES_COLLECTION),
        publishedOnly(),
        where('isFeatured', '==', true),
        orderBy('updatedAt', 'desc'),
        limit(10)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Recipe));
    },
    () => MOCK_RECIPES.filter((r) => r.isFeatured)
  );
}

export async function getTrendingRecipes(): Promise<Recipe[]> {
  return withMockFallback(
    async () => {
      const q = query(
        collection(db, RECIPES_COLLECTION),
        publishedOnly(),
        where('isTrending', '==', true),
        orderBy('updatedAt', 'desc'),
        limit(10)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Recipe));
    },
    () => MOCK_RECIPES.filter((r) => r.isTrending)
  );
}

export async function getRecipesByRegion(region: Region): Promise<Recipe[]> {
  return withMockFallback(
    async () => {
      const q = query(
        collection(db, RECIPES_COLLECTION),
        publishedOnly(),
        where('region', '==', region),
        orderBy('updatedAt', 'desc'),
        limit(30)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Recipe));
    },
    () => MOCK_RECIPES.filter((r) => r.region === region)
  );
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  try {
    const ref = doc(db, RECIPES_COLLECTION, id);
    const snap = await getDoc(ref);
    if (snap.exists()) return { id: snap.id, ...snap.data() } as Recipe;
    // Not in the database (e.g. deleted by an admin): it no longer exists.
    return null;
  } catch (err) {
    console.warn('[recipeService] Falling back to built-in recipe content:', err);
    return getMockRecipeById(id);
  }
}

/**
 * Paginated feed fetch used by the FlashList-backed home feed.
 * Firestore compound queries can't do full-text search natively, so free-text
 * `query` filtering is handled client-side or via a dedicated search index
 * (Algolia/Typesense) — see useRecipeSearch hook for the hybrid approach.
 */
export async function getRecipeFeedPage(cursor?: QueryDocumentSnapshot) {
  try {
    const baseQuery = cursor
      ? query(
          collection(db, RECIPES_COLLECTION),
          publishedOnly(),
          orderBy('updatedAt', 'desc'),
          startAfter(cursor),
          limit(PAGE_SIZE)
        )
      : query(
          collection(db, RECIPES_COLLECTION),
          publishedOnly(),
          orderBy('updatedAt', 'desc'),
          limit(PAGE_SIZE)
        );

    const snap = await getDocs(baseQuery);
    const recipes = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Recipe));
    const nextCursor = snap.docs[snap.docs.length - 1];

    return { recipes, nextCursor, hasMore: snap.docs.length === PAGE_SIZE };
  } catch (err) {
    console.warn('[recipeService] Falling back to built-in recipe content:', err);
    return { recipes: MOCK_RECIPES, nextCursor: undefined, hasMore: false };
  }
}

export async function getRecipesByMealType(mealType: MealType): Promise<Recipe[]> {
  return withMockFallback(
    async () => {
      const q = query(
        collection(db, RECIPES_COLLECTION),
        publishedOnly(),
        where('mealTypes', 'array-contains', mealType),
        orderBy('updatedAt', 'desc'),
        limit(30)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Recipe));
    },
    () => MOCK_RECIPES.filter((r) => r.mealTypes.includes(mealType))
  );
}
// services/recipeService.ts
// Read-only data access layer for mobile clients.
// Writes live in adminRecipeService.ts and are restricted to admins by
// Row Level Security in the database (not just by this file).

import { supabase } from '../lib/supabase';
import { toRecipe } from '../lib/recipeMapper';
import type { Recipe, Region, MealType } from '../types';
import { MOCK_RECIPES, getMockRecipeById } from '../constants/mockRecipes';

const PAGE_SIZE = 20;

// Published recipes only. RLS already hides drafts/archived from non-admins;
// filtering here too keeps admins' home feed identical to what users see.
const publishedRecipes = () => supabase.from('recipes').select('*').eq('status', 'published');

/**
 * Runs a live database query. The bundled app content (constants/mockRecipes.ts)
 * is used ONLY when the database can't be reached (offline / error). An empty
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
      const { data, error } = await publishedRecipes()
        .eq('is_featured', true)
        .order('updated_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []).map(toRecipe);
    },
    () => MOCK_RECIPES.filter((r) => r.isFeatured)
  );
}

export async function getTrendingRecipes(): Promise<Recipe[]> {
  return withMockFallback(
    async () => {
      const { data, error } = await publishedRecipes()
        .eq('is_trending', true)
        .order('updated_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []).map(toRecipe);
    },
    () => MOCK_RECIPES.filter((r) => r.isTrending)
  );
}

export async function getRecipesByRegion(region: Region): Promise<Recipe[]> {
  return withMockFallback(
    async () => {
      const { data, error } = await publishedRecipes()
        .eq('region', region)
        .order('updated_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []).map(toRecipe);
    },
    () => MOCK_RECIPES.filter((r) => r.region === region)
  );
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  try {
    const { data, error } = await supabase.from('recipes').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (data) return toRecipe(data);
    // Not in the database (e.g. deleted by an admin, or still a draft): it doesn't exist for users.
    return null;
  } catch (err) {
    console.warn('[recipeService] Falling back to built-in recipe content:', err);
    return getMockRecipeById(id);
  }
}

/**
 * Paginated feed fetch used by the home feed. Pages are zero-based:
 * getRecipeFeedPage() is page 0, getRecipeFeedPage(1) is the next 20, and so on.
 * Free-text search is handled client-side — see useRecipeSearch.
 */
export async function getRecipeFeedPage(page = 0) {
  try {
    const from = page * PAGE_SIZE;
    const { data, error } = await publishedRecipes()
      .order('updated_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    const recipes = (data ?? []).map(toRecipe);
    const hasMore = recipes.length === PAGE_SIZE;
    return { recipes, nextPage: hasMore ? page + 1 : undefined, hasMore };
  } catch (err) {
    console.warn('[recipeService] Falling back to built-in recipe content:', err);
    return { recipes: MOCK_RECIPES, nextPage: undefined, hasMore: false };
  }
}

export async function getRecipesByMealType(mealType: MealType): Promise<Recipe[]> {
  return withMockFallback(
    async () => {
      const { data, error } = await publishedRecipes()
        .contains('meal_types', [mealType])
        .order('updated_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []).map(toRecipe);
    },
    () => MOCK_RECIPES.filter((r) => r.mealTypes.includes(mealType))
  );
}

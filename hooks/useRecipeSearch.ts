// hooks/useRecipeSearch.ts
import { useMemo, useState, useDeferredValue, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toRecipe } from '../lib/recipeMapper';
import type { Recipe, SearchFilters, Region, MealType, DietaryTag } from '../types';
import { getRecipeCategory, type RecipeCategory } from '../lib/recipeCategories';
import type { RichRecipe } from '../lib/recipeMapper';

const EMPTY_FILTERS: SearchFilters = {
  query: '',
  mealTypes: [],
  dietaryTags: [],
};

/**
 * Hybrid search strategy:
 * - TanStack Query caches the full published-recipe index (kept small/denormalized
 *   with keyIngredientNames, region, mealTypes, dietaryTags fields) for instant,
 *   fully client-side filtering — no network round-trip per keystroke.
 * - useDeferredValue keeps the text input responsive while filtering a large list.
 * - For a production-scale catalog (10k+ recipes) swap the `queryFn` below for a
 *   dedicated search index (Algolia/Typesense/Meilisearch) and keep the same
 *   filter-merging logic client-side.
 */
export function useRecipeSearch() {
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const deferredQuery = useDeferredValue(filters.query);
  const setRegion = useCallback((region?: Region) => setFilters((f) => ({ ...f, region })), []);

  const { data: allRecipes = [], isLoading } = useQuery({
    queryKey: ['recipe-search-index'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from('recipes').select('*').eq('status', 'published');
        if (error) throw error;
        // Empty means the admin has no published recipes; only fall back to the
        // built-in samples if the database itself can't be reached (see catch below).
        return (data ?? []).map(toRecipe) as RichRecipe[];
      } catch (err) {
        console.warn('[useRecipeSearch] Falling back to built-in recipe content:', err);
        return [] as Recipe[];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 min — recipes don't change that often
  });

  const results = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return allRecipes.filter((recipe) => {
      if (normalizedQuery) {
        const matchesTitle = recipe.title.toLowerCase().includes(normalizedQuery);
        const matchesIngredient = (recipe.keyIngredientNames ?? []).some((name) =>
          name.toLowerCase().includes(normalizedQuery)
        );
        const matchesRegion = recipe.region.toLowerCase().includes(normalizedQuery);
        if (!matchesTitle && !matchesIngredient && !matchesRegion) return false;
      }

      if (filters.region && recipe.region !== filters.region) return false;

      if (filters.foodCategory && getRecipeCategory(recipe) !== filters.foodCategory) return false;

      if (filters.keyIngredient) {
        const hasIngredient = (recipe.keyIngredientNames ?? [])
          .map((n) => n.toLowerCase())
          .includes(filters.keyIngredient.toLowerCase());
        if (!hasIngredient) return false;
      }

      if (filters.mealTypes.length > 0) {
        const overlaps = (recipe.mealTypes ?? []).some((mt) => filters.mealTypes.includes(mt)) ||
          (filters.mealTypes.includes('Breakfast') && getRecipeCategory(recipe) === 'Breakfast');
        if (!overlaps) return false;
      }

      if (filters.dietaryTags.length > 0) {
        const overlaps = (recipe.dietaryTags ?? []).some((tag) => filters.dietaryTags.includes(tag));
        if (!overlaps) return false;
      }

      return true;
    });
  }, [
    allRecipes,
    deferredQuery,
    filters.region,
    filters.foodCategory,
    filters.keyIngredient,
    filters.mealTypes,
    filters.dietaryTags,
  ]);

  return {
    filters,
    setQuery: (query: string) => setFilters((f) => ({ ...f, query })),
    setRegion,
    setFoodCategory: (foodCategory?: RecipeCategory) =>
      setFilters((f) => ({ ...f, foodCategory })),
    setKeyIngredient: (keyIngredient?: string) => setFilters((f) => ({ ...f, keyIngredient })),
    // One selection across the whole chip row (meal types AND dietary tags):
    // picking a chip moves the highlight to it; tapping the selected chip clears it.
    toggleMealType: (mealType: MealType) =>
      setFilters((f) => ({
        ...f,
        mealTypes: f.mealTypes.includes(mealType) ? [] : [mealType],
        dietaryTags: [],
      })),
    toggleDietaryTag: (tag: DietaryTag) =>
      setFilters((f) => ({
        ...f,
        dietaryTags: f.dietaryTags.includes(tag) ? [] : [tag],
        mealTypes: [],
      })),
    resetFilters: () => setFilters(EMPTY_FILTERS),
    results,
    isLoading,
    resultCount: results.length,
  };
}
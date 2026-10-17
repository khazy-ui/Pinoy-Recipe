// lib/recipeMapper.ts
//
// Postgres columns are snake_case; the app's Recipe type is camelCase.
// These two functions are the only place that translation happens.
import type { Recipe } from '../types';

export type RichRecipe = Recipe & { foodType?: string; pronunciation?: string };

export function toRecipe(r: any): RichRecipe {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug ?? '',
    description: r.description ?? '',
    heroImageUrl: r.hero_image_url ?? '',
    videoLoopUrl: r.video_loop_url ?? undefined,
    region: r.region,
    mealTypes: r.meal_types ?? [],
    dietaryTags: r.dietary_tags ?? [],
    sourceTags: r.source_tags ?? [],
    prepTimeMinutes: r.prep_time_minutes ?? 0,
    cookTimeMinutes: r.cook_time_minutes ?? 0,
    baseServings: r.base_servings ?? 1,
    difficulty: r.difficulty,
    ingredients: r.ingredients ?? [],
    steps: r.steps ?? [],
    keyIngredientNames: r.key_ingredient_names ?? [],
    isFeatured: !!r.is_featured,
    isTrending: !!r.is_trending,
    createdByAdminId: r.created_by_admin_id ?? '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    publishedAt: r.published_at ?? undefined,
    status: r.status,
    foodType: r.food_type ?? undefined,
    pronunciation: r.pronunciation ?? undefined,
  };
}

const COLUMN_BY_FIELD: Record<string, string> = {
  title: 'title',
  slug: 'slug',
  description: 'description',
  heroImageUrl: 'hero_image_url',
  videoLoopUrl: 'video_loop_url',
  region: 'region',
  mealTypes: 'meal_types',
  dietaryTags: 'dietary_tags',
  sourceTags: 'source_tags',
  prepTimeMinutes: 'prep_time_minutes',
  cookTimeMinutes: 'cook_time_minutes',
  baseServings: 'base_servings',
  difficulty: 'difficulty',
  ingredients: 'ingredients',
  steps: 'steps',
  keyIngredientNames: 'key_ingredient_names',
  isFeatured: 'is_featured',
  isTrending: 'is_trending',
  createdByAdminId: 'created_by_admin_id',
  publishedAt: 'published_at',
  status: 'status',
  foodType: 'food_type',
  pronunciation: 'pronunciation',
};

/**
 * Converts a (partial) Recipe into a row for insert/update. Fields that are
 * undefined are skipped. id, createdAt and updatedAt are managed by the
 * database, so they are never sent.
 */
export function fromRecipe(data: Partial<RichRecipe>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [field, column] of Object.entries(COLUMN_BY_FIELD)) {
    const value = (data as any)[field];
    if (value !== undefined) row[column] = value;
  }
  return row;
}

import type { Recipe } from '../types';

export const RECIPE_CATEGORIES = [
  'Main Dish',
  'Side Dish',
  'Appetizer',
  'Sweet',
  'Dessert',
  'Breakfast',
] as const;
export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

type CategorizedRecipe = Recipe & { foodType?: string };

export function getRecipeCategory(recipe: CategorizedRecipe): RecipeCategory | undefined {
  const foodType = recipe.foodType?.trim().toLowerCase();
  if (foodType === 'breakfast' || recipe.mealTypes.includes('Breakfast')) return 'Breakfast';
  if (foodType === 'main dish' || foodType === 'soup') return 'Main Dish';
  if (foodType === 'side dish') return 'Side Dish';
  if (foodType === 'appetizer') return 'Appetizer';
  if (foodType === 'sweet' || foodType === 'kakanin' || foodType === 'merienda') return 'Sweet';
  if (foodType === 'dessert') return 'Dessert';

  if (recipe.mealTypes.includes('Ulam') || recipe.mealTypes.includes('Soup')) {
    return 'Main Dish';
  }
  if (recipe.mealTypes.includes('Kakanin') || recipe.mealTypes.includes('Merienda')) return 'Sweet';
  return undefined;
}

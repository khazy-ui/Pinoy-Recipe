// types/index.ts
// Core data model for Pinoy Recipes

export type Region =
  | 'Luzon'
  | 'Visayas'
  | 'Mindanao'
  | 'Ilocos'
  | 'Bicol'
  | 'Pampanga'
  | 'Metro Manila'
  | 'National';

export type MealType = 'Ulam' | 'Merienda' | 'Kakanin' | 'Fiesta Specials' | 'Breakfast' | 'Soup';

export type DietaryTag =
  | 'Vegetarian'
  | 'Vegan'
  | 'Pork-Free'
  | 'Seafood'
  | 'Gluten-Free'
  | 'Dairy-Free';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type RecipeSourceTag =
  | 'Panlasang Pinoy'
  | 'Heirloom'
  | 'Quick & Easy'
  | 'Community Submitted'
  | 'Editor\'s Pick';

export interface Ingredient {
  id: string;
  name: string;              // e.g. "Pork belly"
  quantity: number;          // base quantity, scales with servings
  unit: string;              // e.g. "kg", "cup", "tbsp", "pcs"
  notes?: string;            // e.g. "cut into 1-inch cubes"
  isKeyIngredient?: boolean; // surfaced in search/filter (pork, gata, milkfish, etc.)
}

export interface CookStep {
  id: string;
  order: number;
  title: string;
  instruction: string;
  timerSeconds?: number;     // drives the inline visual timer in Cook Mode
  imageUrl?: string;
  videoLoopUrl?: string;
}

export interface Category {
  id: string;
  name: string;              // e.g. "Kakanin", "Fiesta Specials"
  slug: string;
  iconName?: string;         // lucide icon key
  coverImageUrl?: string;
}

export interface Recipe {
  id: string;
  title: string;
  slug: string;
  description: string;

  // string: remote URL (any https image link) — render as { uri: heroImageUrl }
  // number: local asset from require('../assets/...') — render as-is, no { uri } wrapper
  heroImageUrl: string | number;
  videoLoopUrl?: string;

  region: Region;
  mealTypes: MealType[];
  dietaryTags: DietaryTag[];
  sourceTags: RecipeSourceTag[];

  prepTimeMinutes: number;
  cookTimeMinutes: number;
  baseServings: number;      // used by the yield calculator
  difficulty: Difficulty;

  ingredients: Ingredient[];
  steps: CookStep[];

  keyIngredientNames: string[]; // denormalized for fast search (pork, gata, milkfish...)

  isFeatured: boolean;
  isTrending: boolean;

  // Denormalized author/admin metadata (never editable by mobile clients)
  createdByAdminId: string;
  createdAt: string;   // ISO timestamp
  updatedAt: string;   // ISO timestamp
  publishedAt?: string;
  status: 'draft' | 'published' | 'archived';
}

export interface UserProfile {
  uid: string;
  displayName?: string;
  email?: string;
  role: 'user' | 'admin';        // enforced server-side via custom claims, never trust client copy
  favoriteRecipeIds: string[];   // synced copy; local cache lives in Zustand/AsyncStorage
  cookedRecipeCount: number;
  createdAt: string;
}

// Client-side (Zustand) shape for offline/local favorites cache
export interface FavoritesState {
  favoriteIds: Set<string>;
  toggleFavorite: (recipeId: string) => void;
  isFavorite: (recipeId: string) => boolean;
  hydrate: (ids: string[]) => void;
}

export interface SearchFilters {
  query: string;
  region?: Region;
  foodCategory?: 'Main Dish' | 'Side Dish' | 'Appetizer' | 'Sweet' | 'Dessert';
  mealTypes: MealType[];
  dietaryTags: DietaryTag[];
  keyIngredient?: string;
}
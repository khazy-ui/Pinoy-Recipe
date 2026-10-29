import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ArrowLeft, ImageOff } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';
import ThemedBackground from '../../components/ThemedBackground';
import { ResponsiveText as Text } from '../../components/ResponsiveText';
import { getRecipeCategory, RECIPE_CATEGORIES, type RecipeCategory } from '../../lib/recipeCategories';
import { resolveRecipeImageSource } from '../../lib/recipeImage';
import { getRecipesByRegion } from '../../services/recipeService';
import type { Recipe, Region } from '../../types';

const REGIONS: Region[] = ['Luzon', 'Visayas', 'Mindanao'];

export default function RegionRecipesScreen() {
  const { region: regionParam } = useLocalSearchParams<{ region: string }>();
  const router = useRouter();
  const region = REGIONS.find((item) => item.toLowerCase() === regionParam?.toLowerCase());
  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ['recipes-by-region', region],
    queryFn: () => (region ? getRecipesByRegion(region) : Promise.resolve([])),
    enabled: !!region,
  });

  if (!region) {
    return (
      <ThemedBackground>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-[#3A2A1A] dark:text-[#F5EBDD] mb-4">This region is not available.</Text>
          <Pressable onPress={() => router.back()} className="rounded-xl bg-[#D97706] px-4 py-3">
            <Text className="text-white font-semibold">Go back</Text>
          </Pressable>
        </View>
      </ThemedBackground>
    );
  }

  return (
    <ThemedBackground>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="flex-row items-center gap-3 px-4 pt-4 pb-5">
          <Pressable onPress={() => router.back()} accessibilityLabel="Go back" className="rounded-full bg-white dark:bg-[#2A211A] p-2">
            <ArrowLeft size={20} color="#D97706" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-[#3A2A1A] dark:text-[#F5EBDD]">{region}</Text>
            <Text className="text-sm text-[#8A6D4E] dark:text-[#B8A48C]">
              {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <Text className="px-4 py-6 text-[#8A6D4E] dark:text-[#B8A48C]">Loading recipes...</Text>
        ) : RECIPE_CATEGORIES.map((category) => {
          const categoryRecipes = recipes.filter((recipe) => getRecipeCategory(recipe) === category);
          if (categoryRecipes.length === 0) return null;
          return (
            <RecipeCategoryRow
              key={category}
              category={category}
              recipes={categoryRecipes}
              onPress={(recipe) => router.push(`/recipe/${recipe.id}`)}
            />
          );
        })}
        {!isLoading && recipes.length === 0 && (
          <Text className="px-4 py-8 text-center text-[#8A6D4E] dark:text-[#B8A48C]">
            No recipes are available for this region yet.
          </Text>
        )}
      </ScrollView>
    </ThemedBackground>
  );
}

function RecipeCategoryRow({
  category,
  recipes,
  onPress,
}: {
  category: RecipeCategory;
  recipes: Recipe[];
  onPress: (recipe: Recipe) => void;
}) {
  return (
    <View className="mb-5">
      <View className="flex-row items-center gap-2 px-4 mb-2">
        <Text className="text-base font-semibold text-[#3A2A1A] dark:text-[#F5EBDD]">{category}</Text>
        <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C]">{recipes.length} recipes</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
        {recipes.map((recipe) => {
          const source = resolveRecipeImageSource(recipe.heroImageUrl);
          return (
            <Pressable
              key={recipe.id}
              onPress={() => onPress(recipe)}
              className="w-40 rounded-2xl overflow-hidden bg-white dark:bg-[#2A211A]"
            >
              {source ? (
                <Image source={source} style={{ width: 160, height: 110 }} contentFit="cover" />
              ) : (
                <View className="items-center justify-center bg-[#FFF3E0] dark:bg-[#33291F]" style={{ width: 160, height: 110 }}>
                  <ImageOff size={24} color="#D97706" />
                </View>
              )}
              <Text numberOfLines={2} className="p-3 text-sm font-semibold text-[#3A2A1A] dark:text-[#F5EBDD]">
                {recipe.title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

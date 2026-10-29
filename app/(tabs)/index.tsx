// app/(tabs)/index.tsx
import { View, RefreshControl, Pressable, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  getRecipeFeedPage,
  getFeaturedRecipes,
  getTrendingRecipes,
} from '../../services/recipeService';
import { RecipeCard } from '../../components/recipe/RecipeCard';
import { RecipeCardSkeleton } from '../../components/recipe/RecipeCardSkeleton';
import { FeaturedCarousel } from '../../components/recipe/FeaturedCarousel';
import { RegionChipRow } from '../../components/recipe/RegionChipRow';
import ThemedBackground from '../../components/ThemedBackground';
import NotificationBell from '../../components/NotificationBell';
import type { Recipe } from '../../types';
import { ResponsiveText as Text } from '../../components/ResponsiveText';
import { getRecipeCategory, RECIPE_CATEGORIES, type RecipeCategory } from '../../lib/recipeCategories';

export default function HomeFeedScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory>();

  const { data: featured } = useQuery({
    queryKey: ['featured-recipes'],
    queryFn: getFeaturedRecipes,
    staleTime: 10 * 60 * 1000,
  });

  const { data: trending } = useQuery({
    queryKey: ['trending-recipes'],
    queryFn: getTrendingRecipes,
    staleTime: 10 * 60 * 1000,
  });

  const { data: feedPage, isLoading: loadingFeed } = useQuery({
    queryKey: ['recipe-feed', 'all'],
    queryFn: async () => ({ recipes: (await getRecipeFeedPage()).recipes }),
    staleTime: 5 * 60 * 1000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['recipe-feed'] });
    await queryClient.invalidateQueries({ queryKey: ['featured-recipes'] });
    await queryClient.invalidateQueries({ queryKey: ['trending-recipes'] });
    setRefreshing(false);
  }, [queryClient]);

  const openRecipe = (recipe: Recipe) => router.push(`/recipe/${recipe.id}`);
  const visibleRecipes = (feedPage?.recipes ?? []).filter(
    (recipe) => !selectedCategory || getRecipeCategory(recipe) === selectedCategory
  );
  const spotlightRecipes = (trending?.length ?? 0) > 0 ? trending ?? [] : featured ?? [];

  if (loadingFeed && !feedPage) {
    return (
      <ThemedBackground>
        <View className="flex-1 px-4 pt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <RecipeCardSkeleton key={i} />
          ))}
        </View>
      </ThemedBackground>
    );
  }

  return (
    <ThemedBackground>
      <FlashList
        data={visibleRecipes}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D97706" />}
        ListHeaderComponent={
          <View>
            <View className="flex-row items-start justify-between px-4 pt-4 pb-2">
              <View className="flex-1 pr-3">
                <Text className="text-2xl font-bold text-[#3A2A1A] dark:text-[#F5EBDD]">Kamusta, Mag-luto tayo!</Text>
                <Text className="text-sm text-[#8A6D4E] dark:text-[#B8A48C] mt-1">
                  Curated Filipino recipes from every region
                </Text>
              </View>
              <NotificationBell />
            </View>

            <View className="px-4 mt-2 mb-2">
              <Text className="text-lg font-semibold text-[#3A2A1A] dark:text-[#F5EBDD]">
                {(trending?.length ?? 0) > 0 ? 'Now Trending' : 'Featured recipes'}
              </Text>
            </View>
            {spotlightRecipes.length > 0 && (
              <FeaturedCarousel recipes={spotlightRecipes} onPressRecipe={openRecipe} />
            )}

            <RegionChipRow
              selectedRegion={undefined}
              large
              onSelectRegion={(region) => router.push(`/region/${region}`)}
            />

            <Text className="px-4 mt-2 text-sm font-semibold text-[#8A6D4E] dark:text-[#B8A48C]">
              Meal type categories
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
            >
              {RECIPE_CATEGORIES.map((category) => {
                const active = selectedCategory === category;
                return (
                  <Pressable
                    key={category}
                    onPress={() => setSelectedCategory(active ? undefined : category)}
                    className={`rounded-full border px-4 py-2 ${
                      active
                        ? 'bg-[#D97706] border-[#D97706]'
                        : 'bg-white dark:bg-[#2A211A] border-[#F0E4D4] dark:border-[#3A2A1A]'
                    }`}
                  >
                    <Text className={`text-xs ${active ? 'text-white' : 'text-[#3A2A1A] dark:text-[#F5EBDD]'}`}>
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View className="px-4 mt-2 mb-1">
              <Text className="text-lg font-semibold text-[#3A2A1A] dark:text-[#F5EBDD]">
                {selectedCategory ? `${selectedCategory} recipes` : 'Recipes for you'}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View className="px-4">
            <RecipeCard recipe={item} onPress={() => openRecipe(item)} />
          </View>
        )}
        ListEmptyComponent={
          selectedCategory ? (
            <Text className="px-4 py-6 text-center text-sm text-[#8A6D4E] dark:text-[#B8A48C]">
              No {selectedCategory.toLowerCase()} recipes found yet.
            </Text>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 26 }}
      />
    </ThemedBackground>
  );
}
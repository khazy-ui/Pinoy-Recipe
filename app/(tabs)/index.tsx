// app/(tabs)/index.tsx
import { View, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  getRecipeFeedPage,
  getFeaturedRecipes,
  getTrendingRecipes,
  getRecipesByRegion,
} from '../../services/recipeService';
import { RecipeCard } from '../../components/recipe/RecipeCard';
import { RecipeCardSkeleton } from '../../components/recipe/RecipeCardSkeleton';
import { FeaturedCarousel } from '../../components/recipe/FeaturedCarousel';
import { RegionChipRow } from '../../components/recipe/RegionChipRow';
import ThemedBackground from '../../components/ThemedBackground';
import NotificationBell from '../../components/NotificationBell';
import type { Recipe, Region } from '../../types';
import { ResponsiveText as Text } from '../../components/ResponsiveText';

export default function HomeFeedScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<Region>();

  const { data: featured, isLoading: loadingFeatured } = useQuery({
    queryKey: ['featured-recipes'],
    queryFn: getFeaturedRecipes,
    staleTime: 10 * 60 * 1000,
  });

  const { data: trending, isLoading: loadingTrending } = useQuery({
    queryKey: ['trending-recipes'],
    queryFn: getTrendingRecipes,
    staleTime: 10 * 60 * 1000,
  });

  const { data: feedPage, isLoading: loadingFeed } = useQuery({
    queryKey: ['recipe-feed', selectedRegion ?? 'all'],
    queryFn: async () => ({
      recipes: selectedRegion ? await getRecipesByRegion(selectedRegion) : (await getRecipeFeedPage()).recipes,
    }),
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
        data={feedPage?.recipes ?? []}
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

            {!selectedRegion && !loadingFeatured && featured && featured.length > 0 && (
              <FeaturedCarousel recipes={featured} onPressRecipe={openRecipe} />
            )}

            <RegionChipRow
              selectedRegion={selectedRegion}
              onSelectRegion={(region) =>
                setSelectedRegion((current) => (current === region ? undefined : region))
              }
            />

            {(selectedRegion || (!loadingTrending && trending && trending.length > 0)) && (
              <View className="px-4 mt-2 mb-1">
                <Text className="text-lg font-semibold text-[#3A2A1A] dark:text-[#F5EBDD]">
                  {selectedRegion ? `Recipes from ${selectedRegion}` : 'Now Trending'}
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View className="px-4">
            <RecipeCard recipe={item} onPress={() => openRecipe(item)} />
          </View>
        )}
        ListEmptyComponent={
          selectedRegion ? (
            <Text className="px-4 py-6 text-center text-sm text-[#8A6D4E] dark:text-[#B8A48C]">
              No recipes found for {selectedRegion} yet.
            </Text>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 26 }}
      />
    </ThemedBackground>
  );
}
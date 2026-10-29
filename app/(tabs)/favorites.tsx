// app/(tabs)/favorites.tsx
import { View, Pressable, FlatList, ScrollView } from 'react-native';
import { useState } from 'react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Heart, Clock, Star, ImageOff, Search } from 'lucide-react-native';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import { getRecipeById } from '../../services/recipeService';
import { resolveRecipeImageSource } from '../../lib/recipeImage';
import { useThemeStore } from '../../store/useThemeStore';
import ThemedBackground from '../../components/ThemedBackground';
import type { Recipe, Region } from '../../types';
import { ResponsiveText as Text } from '../../components/ResponsiveText';
import { RECIPE_CATEGORIES, getRecipeCategory, type RecipeCategory } from '../../lib/recipeCategories';

export default function FavoritesScreen() {
  const router = useRouter();
  const [selectedRegion, setSelectedRegion] = useState<Region>();
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory>();
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const isDark = useThemeStore((s) => s.isDark);

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ['favorite-recipes', favoriteIds],
    queryFn: async () => {
      const results = await Promise.all(favoriteIds.map((id) => getRecipeById(id)));
      return results.filter((r): r is Recipe => r !== null);
    },
  });
  const filteredRecipes = recipes.filter(
    (recipe) =>
      (!selectedRegion || recipe.region === selectedRegion) &&
      (!selectedCategory || getRecipeCategory(recipe) === selectedCategory)
  );

  return (
    <ThemedBackground>
      <View className="flex-1 px-4 pt-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-[#3A2A1A] dark:text-[#F5EBDD]">Favorites</Text>
          <Pressable onPress={() => router.push('/(tabs)/search')} accessibilityLabel="Search recipes" className="p-2">
            <Search size={20} color="#D97706" />
          </Pressable>
        </View>
        <Text className="text-sm text-[#8A6D4E] dark:text-[#B8A48C] mt-1 mb-4">
          {favoriteIds.length > 0
            ? `You have ${favoriteIds.length} recipe${favoriteIds.length === 1 ? '' : 's'} saved in your kitchen book`
            : 'Nothing saved yet — start building your kitchen book'}
        </Text>

        <Text className="text-xs font-semibold text-[#8A6D4E] dark:text-[#B8A48C] mb-2">Location</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ gap: 8, paddingBottom: 8, alignItems: 'flex-start' }}
        >
          {(['Luzon', 'Visayas', 'Mindanao'] as Region[]).map((region) => (
            <FilterChip
              key={region}
              label={region}
              selected={selectedRegion === region}
              onPress={() => setSelectedRegion((current) => current === region ? undefined : region)}
            />
          ))}
        </ScrollView>

        <Text className="text-xs font-semibold text-[#8A6D4E] dark:text-[#B8A48C] mb-2">Meal type</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ gap: 8, paddingBottom: 12, alignItems: 'flex-start' }}
        >
          {RECIPE_CATEGORIES.map((category) => (
            <FilterChip
              key={category}
              label={category}
              selected={selectedCategory === category}
              onPress={() => setSelectedCategory((current) => current === category ? undefined : category)}
            />
          ))}
        </ScrollView>

        {isLoading && <Text className="text-[#8A6D4E] dark:text-[#B8A48C]">Loading...</Text>}

        <FlatList
          data={filteredRecipes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 16 }}
          renderItem={({ item }) => {
            const imageSource = resolveRecipeImageSource(item.heroImageUrl);
            return (
            <Pressable
              onPress={() => router.push(`/recipe/${item.id}`)}
              className="bg-white dark:bg-[#2A211A] rounded-2xl overflow-hidden mb-4"
            >
              <View className="relative">
                {imageSource ? (
                  <Image
                    source={imageSource}
                    style={{ width: '100%', height: 180 }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={150}
                  />
                ) : (
                  <View className="items-center justify-center bg-[#FFF3E0]" style={{ width: '100%', height: 180 }}>
                    <ImageOff size={28} color="#D97706" />
                  </View>
                )}
              </View>
              <View className="p-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-[#3A2A1A] dark:text-[#F5EBDD] flex-1 pr-2" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Pressable onPress={() => toggleFavorite(item.id)} hitSlop={8}>
                    <Heart size={20} color="#D97706" fill="#D97706" />
                  </Pressable>
                </View>
                <View className="flex-row items-center gap-3 mt-2">
                  <View className="bg-[#FFF3E0] rounded-full px-2 py-0.5">
                    <Text className="text-[10px] font-semibold text-[#D97706]">{item.region.toUpperCase()}</Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Clock size={12} color="#8A6D4E" />
                    <Text className="text-xs text-[#8A6D4E]">
                      {item.prepTimeMinutes + item.cookTimeMinutes} mins
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Star size={12} color="#D97706" fill="#D97706" />
                    <Text className="text-xs text-[#8A6D4E]">4.8</Text>
                  </View>
                </View>
              </View>
            </Pressable>
            );
          }}
          ListFooterComponent={
            <View className="flex-row items-center justify-center gap-2 py-4">
              <Heart size={14} color="#D97706" />
              <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C]">Tap the heart on any recipe to save it here.</Text>
            </View>
          }
          ListEmptyComponent={
            !isLoading ? (
              <Text className="py-8 text-center text-sm text-[#8A6D4E] dark:text-[#B8A48C]">
                {recipes.length ? 'No favorites match these filters.' : 'No favorite recipes yet.'}
              </Text>
            ) : null
          }
        />
      </View>
    </ThemedBackground>
  );
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-4 py-2 ${
        selected
          ? 'bg-[#D97706] border-[#D97706]'
          : 'bg-white dark:bg-[#2A211A] border-[#F0E4D4] dark:border-[#3A2A1A]'
      }`}
    >
      <Text className={`text-xs ${selected ? 'text-white' : 'text-[#3A2A1A] dark:text-[#F5EBDD]'}`}>{label}</Text>
    </Pressable>
  );
}
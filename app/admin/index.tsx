// app/admin/index.tsx
//
// "Add Recipe" tab: lists existing recipes (tap to edit or delete) and has a
// button to create a new one.
import { useMemo, useState } from 'react';
import { View, Pressable, FlatList, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTopInset } from '../../hooks/useTopInset';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search as SearchIcon, X, ImageOff } from 'lucide-react-native';
import { Image } from 'expo-image';
import type { Region } from '../../types';
import { getAllRecipesForAdmin } from '../../services/adminRecipeService';
import ThemedBackground from '../../components/ThemedBackground';
import { ResponsiveText as Text, ResponsiveTextInput as TextInput } from '../../components/ResponsiveText';
import { getRecipeCategory, RECIPE_CATEGORIES, type RecipeCategory } from '../../lib/recipeCategories';
import { resolveRecipeImageSource } from '../../lib/recipeImage';

export default function AdminRecipeListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<Region>();
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory>();

  const { data: recipes, isLoading } = useQuery({
    queryKey: ['admin-recipes'],
    queryFn: getAllRecipesForAdmin,
  });

  // Search by title, region, or status (draft / published).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = recipes ?? [];
    return list.filter((recipe) => {
      const matchesSearch =
        !q ||
        [recipe.title, recipe.region, recipe.status, recipe.foodType]
          .some((value) => String(value ?? '').toLowerCase().includes(q));
      return (
        matchesSearch &&
        (!selectedRegion || recipe.region === selectedRegion) &&
        (!selectedCategory || getRecipeCategory(recipe) === selectedCategory)
      );
    });
  }, [recipes, search, selectedRegion, selectedCategory]);

  return (
    <ThemedBackground>
      <View className="flex-1 px-4" style={{ paddingTop: topInset + 16 }}>
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-xl font-bold text-[#3A2A1A] dark:text-[#F5EBDD]">Manage Recipes</Text>
          <Pressable
            onPress={() => router.push('/admin/recipe-form')}
            className="flex-row items-center gap-1 bg-[#D97706] rounded-full px-3 py-2"
          >
            <Plus size={16} color="white" />
            <Text className="text-white text-xs font-semibold">Add Recipe</Text>
          </Pressable>
        </View>

        <View className="flex-row items-center bg-white dark:bg-[#2A211A] rounded-2xl px-4 py-3 gap-2 mb-3">
          <SearchIcon size={18} color="#8A6D4E" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search recipes by name, region, or status..."
            placeholderTextColor="#B8A48C"
            autoCapitalize="none"
            returnKeyType="search"
            className="flex-1 text-[#3A2A1A] dark:text-[#F5EBDD]"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <X size={16} color="#8A6D4E" />
            </Pressable>
          )}
        </View>

        <View className="flex-row gap-2 mb-3">
          {(['Luzon', 'Visayas', 'Mindanao'] as Region[]).map((region) => (
            <Pressable
              key={region}
              onPress={() => setSelectedRegion((current) => current === region ? undefined : region)}
              className={`flex-1 items-center rounded-xl border py-3 ${
                selectedRegion === region
                  ? 'bg-[#D97706] border-[#D97706]'
                  : 'bg-white dark:bg-[#2A211A] border-[#F0E4D4] dark:border-[#3A2A1A]'
              }`}
            >
              <Text className={`text-xs font-semibold ${selectedRegion === region ? 'text-white' : 'text-[#3A2A1A] dark:text-[#F5EBDD]'}`}>
                {region.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
        >
          {RECIPE_CATEGORIES.map((category) => (
            <Pressable
              key={category}
              onPress={() => setSelectedCategory((current) => current === category ? undefined : category)}
              className={`min-w-[96px] min-h-[40px] shrink-0 items-center justify-center rounded-xl border px-3 py-2 ${
                selectedCategory === category
                  ? 'bg-[#D97706] border-[#D97706]'
                  : 'bg-white dark:bg-[#2A211A] border-[#F0E4D4] dark:border-[#3A2A1A]'
              }`}
            >
              <Text className={`text-xs text-center ${selectedCategory === category ? 'text-white' : 'text-[#3A2A1A] dark:text-[#F5EBDD]'}`}>
                {category}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C] mb-2">
          {filtered.length} {filtered.length === 1 ? 'recipe' : 'recipes'}
        </Text>
        {isLoading && <Text className="text-[#8A6D4E] dark:text-[#B8A48C]">Loading...</Text>}

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            !isLoading && (recipes ?? []).length > 0 ? (
              <Text className="text-[#8A6D4E] dark:text-[#B8A48C] text-center mt-8">
                No recipes match these search and filter options.
              </Text>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          renderItem={({ item }) => {
            const imageSource = resolveRecipeImageSource(item.heroImageUrl);
            return (
              <Pressable
                onPress={() => router.push({ pathname: '/admin/recipe-form', params: { id: item.id } })}
                className="bg-white dark:bg-[#2A211A] rounded-2xl overflow-hidden mb-3 flex-row items-center"
              >
                {imageSource ? (
                  <Image source={imageSource} style={{ width: 90, height: 88 }} contentFit="cover" />
                ) : (
                  <View className="h-[88px] w-[90px] items-center justify-center bg-[#FFF3E0]">
                    <ImageOff size={20} color="#D97706" />
                  </View>
                )}
                <View className="flex-1 px-3">
                  <Text numberOfLines={1} className="text-[#3A2A1A] dark:text-[#F5EBDD] font-semibold">{item.title}</Text>
                  <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C]">
                    {item.region} · {item.foodType ?? 'Recipe'} · {item.status}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      </View>
    </ThemedBackground>
  );
}
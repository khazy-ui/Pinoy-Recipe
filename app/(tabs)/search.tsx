// app/(tabs)/search.tsx
import { View, ScrollView, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Search as SearchIcon } from 'lucide-react-native';
import { useRecipeSearch } from '../../hooks/useRecipeSearch';
import { RecipeCard } from '../../components/recipe/RecipeCard';
import { FilterChipBar } from '../../components/search/FilterChipBar';
import { RegionChipRow } from '../../components/recipe/RegionChipRow';
import ThemedBackground from '../../components/ThemedBackground';
import { useRouter } from 'expo-router';
import type { Region } from '../../types';
import { ResponsiveText as Text, ResponsiveTextInput as TextInput } from '../../components/ResponsiveText';
import { RECIPE_CATEGORIES, type RecipeCategory } from '../../lib/recipeCategories';

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ region?: Region }>();
  const {
    filters,
    setQuery,
    setRegion,
    setFoodCategory,
    toggleMealType,
    toggleDietaryTag,
    results,
    isLoading,
    resultCount,
  } = useRecipeSearch();
  const [selectedRegion, setSelectedRegion] = useState<Region>();
  const selectedCategory = filters.foodCategory;

  useEffect(() => {
    if (params.region) {
      setSelectedRegion(params.region);
      setRegion(params.region);
    }
  }, [params.region, setRegion]);

  return (
    <ThemedBackground>
      <View className="flex-1 px-4 pt-4">
        <View className="flex-row items-center bg-white dark:bg-[#2A211A] rounded-2xl px-4 py-3 gap-2">
          <SearchIcon size={18} color="#8A6D4E" />
          <TextInput
            placeholder="Search dish, ingredient, or region..."
            placeholderTextColor="#B8A48C"
            value={filters.query}
            onChangeText={setQuery}
            className="flex-1 text-[#3A2A1A] dark:text-[#F5EBDD]"
          />
        </View>

        <Text className="text-xs font-semibold text-[#8A6D4E] dark:text-[#B8A48C] mt-3">Location</Text>
        <RegionChipRow
          selectedRegion={selectedRegion}
          onSelectRegion={(region) => {
            const nextRegion = selectedRegion === region ? undefined : region;
            setSelectedRegion(nextRegion);
            setRegion(nextRegion);
          }}
        />
        <Text className="text-xs font-semibold text-[#8A6D4E] dark:text-[#B8A48C]">Meal type</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ gap: 8, paddingVertical: 8, alignItems: 'flex-start' }}
        >
          {RECIPE_CATEGORIES.map((category: RecipeCategory) => (
            <Pressable
              key={category}
              onPress={() => setFoodCategory(selectedCategory === category ? undefined : category)}
              className={`rounded-full border px-3 py-2 ${
                selectedCategory === category
                  ? 'bg-[#D97706] border-[#D97706]'
                  : 'bg-white dark:bg-[#2A211A] border-[#F0E4D4] dark:border-[#3A2A1A]'
              }`}
            >
              <Text className={`text-xs ${selectedCategory === category ? 'text-white' : 'text-[#3A2A1A] dark:text-[#F5EBDD]'}`}>
                {category}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <FilterChipBar
          selectedMealTypes={filters.mealTypes}
          selectedDietaryTags={filters.dietaryTags}
          onToggleMealType={toggleMealType}
          onToggleDietaryTag={toggleDietaryTag}
        />

        <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C] my-2">
          {isLoading ? 'Searching...' : `${resultCount} ${resultCount === 1 ? 'Result' : 'Results'}`}
        </Text>

        <FlashList
          data={results}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <RecipeCard recipe={item} onPress={() => router.push(`/recipe/${item.id}`)} />
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </ThemedBackground>
  );
}
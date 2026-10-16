// app/(tabs)/search.tsx
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Search as SearchIcon } from 'lucide-react-native';
import { useRecipeSearch } from '../../hooks/useRecipeSearch';
import { RecipeCard } from '../../components/recipe/RecipeCard';
import { FilterChipBar } from '../../components/search/FilterChipBar';
import ThemedBackground from '../../components/ThemedBackground';
import { useRouter } from 'expo-router';
import type { Region } from '../../types';
import { ResponsiveText as Text, ResponsiveTextInput as TextInput } from '../../components/ResponsiveText';

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ region?: Region }>();
  const {
    filters,
    setQuery,
    setRegion,
    toggleMealType,
    toggleDietaryTag,
    results,
    isLoading,
    resultCount,
  } = useRecipeSearch();

  useEffect(() => {
    if (params.region) setRegion(params.region);
  }, [params.region]);

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

        <FilterChipBar
          selectedMealTypes={filters.mealTypes}
          selectedDietaryTags={filters.dietaryTags}
          onToggleMealType={toggleMealType}
          onToggleDietaryTag={toggleDietaryTag}
        />

        <Text className="text-xs text-[#8A6D4E] dark:text-[#B8A48C] my-2">
          {isLoading ? 'Searching...' : `${resultCount} Result`}
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